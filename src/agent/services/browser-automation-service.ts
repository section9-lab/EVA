import { browser, Tabs } from 'wxt/browser';
import { BrowserTool } from '../tools/browser-tool';

/**
 * Browser Automation Service using Playwright directly in the extension
 * 这个服务将Playwright集成到扩展中，无需外部Host服务
 */
export class BrowserAutomationService {
  private connectedTabId: number | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // 在扩展初始化时设置必要的监听器
      await this.setupMessageListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize BrowserAutomationService:', error);
    }
  }

  /**
   * 设置消息监听器，与内容脚本通信
   */
  private async setupMessageListeners() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开启以支持异步响应
    });
  }

  /**
   * 处理来自内容脚本和其他组件的消息
   */
  private async handleMessage(
    message: any,
    sender: browser.Runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    try {
      switch (message.action) {
        case 'connectToTab':
          const tabId = sender.tab?.id;
          if (tabId) {
            await this.connectToTab(tabId);
            sendResponse({ success: true, tabId });
          } else {
            sendResponse({ success: false, error: 'No tab ID found' });
          }
          break;

        case 'executePageAction':
          if (!this.connectedTabId) {
            sendResponse({ success: false, error: 'No connected tab' });
            return;
          }

          const result = await this.executeInContentScript(this.connectedTabId, message.data);
          sendResponse({ success: true, result });
          break;

        case 'getPageInfo':
          if (!this.connectedTabId) {
            sendResponse({ success: false, error: 'No connected tab' });
            return;
          }

          const pageInfo = await this.getPageInfo(this.connectedTabId);
          sendResponse({ success: true, pageInfo });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * 连接到指定的标签页
   */
  private async connectToTab(tabId: number): Promise<void> {
    try {
      // 确保内容脚本已注入
      await this.ensureContentScriptInjected(tabId);
      this.connectedTabId = tabId;
      console.log(`Connected to tab ${tabId}`);
    } catch (error) {
      console.error(`Failed to connect to tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * 确保内容脚本已注入到标签页中
   */
  private async ensureContentScriptInjected(tabId: number): Promise<void> {
    try {
      // 检查内容脚本是否已存在
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          return window.__EVA_CONTENT_SCRIPT_INJECTED__ === true;
        }
      });

      const isInjected = results[0]?.result || false;

      if (!isInjected) {
        // 注入内容脚本
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });

        // 等待脚本加载
        await this.waitForContentScriptReady(tabId);
      }
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw error;
    }
  }

  /**
   * 等待内容脚本准备就绪
   */
  private async waitForContentScriptReady(tabId: number, timeout = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId },
          func: () => {
            return window.__EVA_CONTENT_SCRIPT_READY__;
          }
        });

        if (results[0]?.result) {
          return;
        }
      } catch (error) {
        // 忽略错误，继续重试
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Content script not ready within timeout');
  }

  /**
   * 在内容脚本中执行操作
   */
  private async executeInContentScript(tabId: number, actionData: any): Promise<any> {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: (data) => {
          // 这个函数将在内容脚本上下文中执行
          return window.__EVA_CONTENT_SCRIPT_API__.executeAction(data);
        },
        args: [actionData]
      });

      return results[0]?.result;
    } catch (error) {
      console.error('Failed to execute in content script:', error);
      throw error;
    }
  }

  /**
   * 获取页面信息
   */
  private async getPageInfo(tabId: number): Promise<any> {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            url: window.location.href,
            title: document.title,
            content: document.body.innerText.substring(0, 5000),
            elements: this.getElementsInfo(),
            forms: this.getFormsInfo(),
            links: this.getLinksInfo(),
            images: this.getImagesInfo(),
            timestamp: Date.now()
          };
        }
      });

      return results[0]?.result || {};
    } catch (error) {
      console.error('Failed to get page info:', error);
      return {
        url: '',
        title: '',
        content: '',
        elements: [],
        forms: [],
        links: [],
        images: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * 连接到当前活动标签页
   */
  async connectToActiveTab(): Promise<number | null> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id) {
        throw new Error('No active tab found');
      }

      await this.connectToTab(activeTab.id);
      return activeTab.id;
    } catch (error) {
      console.error('Failed to connect to active tab:', error);
      return null;
    }
  }

  /**
   * 执行页面操作 - 公共接口
   */
  async executeAction(action: {
    type: string;
    selector?: string;
    text?: string;
    options?: any;
  }): Promise<any> {
    if (!this.connectedTabId) {
      const tabId = await this.connectToActiveTab();
      if (!tabId) {
        throw new Error('Failed to connect to any tab');
      }
    }

    return await this.executeInContentScript(this.connectedTabId, action);
  }

  /**
   * 获取当前页面信息 - 公共接口
   */
  async getCurrentPageInfo(): Promise<any> {
    if (!this.connectedTabId) {
      const tabId = await this.connectToActiveTab();
      if (!tabId) {
        throw new Error('Failed to connect to any tab');
      }
    }

    return await this.getPageInfo(this.connectedTabId);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.connectedTabId = null;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connectedTabId !== null;
  }

  /**
   * 获取当前连接的标签页ID
   */
  getConnectedTabId(): number | null {
    return this.connectedTabId;
  }
}