#!/usr/bin/env node

import { chromium } from 'playwright';
import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PlaywrightHost {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.wsServer = null;
    this.clients = new Set();
    this.isShuttingDown = false;
  }

  async start() {
    console.log('Starting EVA Playwright Host...');

    // 启动 WebSocket 服务器
    this.wsServer = new WebSocketServer({
      port: 8765,
      host: 'localhost'
    });

    this.wsServer.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling message:', error);
          this.sendError(ws, error.message);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // 发送连接确认
      this.sendResponse(ws, {
        type: 'connected',
        message: 'Playwright host connected successfully'
      });
    });

    console.log('Playwright Host started on ws://localhost:8765');

    // 优雅关闭
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async handleMessage(ws, message) {
    const { id, action, params } = message;

    try {
      let result;

      switch (action) {
        case 'launch':
          result = await this.launchBrowser(params);
          break;
        case 'navigate':
          result = await this.navigate(params);
          break;
        case 'click':
          result = await this.click(params);
          break;
        case 'fill':
          result = await this.fill(params);
          break;
        case 'type':
          result = await this.type(params);
          break;
        case 'scroll':
          result = await this.scroll(params);
          break;
        case 'wait':
          result = await this.wait(params);
          break;
        case 'screenshot':
          result = await this.takeScreenshot(params);
          break;
        case 'evaluate':
          result = await this.evaluate(params);
          break;
        case 'getPageInfo':
          result = await this.getPageInfo();
          break;
        case 'close':
          result = await this.closeBrowser();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      this.sendResponse(ws, {
        id,
        type: 'response',
        action,
        success: true,
        result
      });

    } catch (error) {
      this.sendResponse(ws, {
        id,
        type: 'response',
        action,
        success: false,
        error: error.message
      });
    }
  }

  async launchBrowser(params = {}) {
    const { headless = true, viewport = { width: 1280, height: 720 } } = params;

    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport,
      ...params.contextOptions
    });

    this.page = await this.context.newPage();

    // 设置默认超时
    this.page.setDefaultTimeout(30000);

    return {
      success: true,
      browserInfo: {
        headless,
        viewport,
        userAgent: await this.page.evaluate(() => navigator.userAgent)
      }
    };
  }

  async navigate(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { url } = params;
    const response = await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    return {
      url: this.page.url(),
      status: response?.status(),
      title: await this.page.title()
    };
  }

  async click(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { selector, options = {} } = params;

    // 等待元素可见
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: 10000
    });

    // 高亮元素（如果不是 headless 模式）
    if (!this.browser._options.headless) {
      await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.style.border = '2px solid red';
          element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        }
      }, selector);

      await this.page.waitForTimeout(500);
    }

    await this.page.click(selector, options);

    return { success: true, selector };
  }

  async fill(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { selector, value, options = {} } = params;

    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: 10000
    });

    await this.page.fill(selector, value, options);

    return { success: true, selector, value };
  }

  async type(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { selector, text, options = {} } = params;

    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: 10000
    });

    await this.page.type(selector, text, options);

    return { success: true, selector, text };
  }

  async scroll(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { selector, direction = 'down', distance = 500 } = params;

    if (selector) {
      // 滚动到特定元素
      await this.page.waitForSelector(selector, {
        state: 'visible',
        timeout: 10000
      });

      await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, selector);
    } else {
      // 页面滚动
      await this.page.evaluate((dir, dist) => {
        if (dir === 'down') {
          window.scrollBy(0, dist);
        } else if (dir === 'up') {
          window.scrollBy(0, -dist);
        }
      }, direction, distance);
    }

    await this.page.waitForTimeout(500);

    return { success: true, direction, distance };
  }

  async wait(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { selector, timeout = 10000 } = params;

    if (selector) {
      await this.page.waitForSelector(selector, {
        state: 'visible',
        timeout
      });
    } else {
      await this.page.waitForTimeout(timeout);
    }

    return { success: true };
  }

  async takeScreenshot(params = {}) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { fullPage = true, selector } = params;

    let screenshot;
    if (selector) {
      const element = await this.page.$(selector);
      screenshot = await element?.screenshot();
    } else {
      screenshot = await this.page.screenshot({
        fullPage,
        type: 'png'
      });
    }

    // 转换为 base64
    const base64 = screenshot.toString('base64');

    return {
      success: true,
      data: `data:image/png;base64,${base64}`,
      selector
    };
  }

  async evaluate(params) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const { script, args = [] } = params;
    const result = await this.page.evaluate(script, ...args);

    return { success: true, result };
  }

  async getPageInfo() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch first.');
    }

    const info = await this.page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        interactiveElements: Array.from(document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"], [tabindex]:not([tabindex="-1"])')).map(el => ({
          tagName: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50) || '',
          selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase(),
          type: el.type || 'unknown'
        }))
      };
    });

    return info;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    return { success: true };
  }

  sendResponse(ws, response) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  sendError(ws, error) {
    this.sendResponse(ws, {
      type: 'error',
      error
    });
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('Shutting down Playwright Host...');

    // 关闭所有客户端连接
    this.clients.forEach(ws => {
      ws.close();
    });

    // 关闭 WebSocket 服务器
    if (this.wsServer) {
      this.wsServer.close();
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
    }

    console.log('Playwright Host shut down complete.');
    process.exit(0);
  }
}

// 启动服务
const host = new PlaywrightHost();
host.start().catch(console.error);