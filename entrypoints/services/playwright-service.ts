import { browser } from 'wxt/browser';

export interface PlaywrightAction {
  id: string;
  action: string;
  params?: any;
  timeout?: number;
}

export interface PlaywrightResult {
  id: string;
  action: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class PlaywrightService {
  private static instance: PlaywrightService;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private messageHandlers: Map<string, (result: PlaywrightResult) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;

  static getInstance(): PlaywrightService {
    if (!PlaywrightService.instance) {
      PlaywrightService.instance = new PlaywrightService();
    }
    return PlaywrightService.instance;
  }

  async connect(): Promise<boolean> {
    if (this.isConnected || this.isConnecting) {
      return this.isConnected;
    }

    this.isConnecting = true;

    try {
      // 尝试连接到 Playwright Host
      this.ws = new WebSocket('ws://localhost:8765');

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          resolve(false);
        }, 5000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          console.log('Connected to Playwright Host');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupMessageHandlers();
          resolve(true);
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws!.onclose = () => {
          clearTimeout(timeout);
          console.log('Disconnected from Playwright Host');
          this.isConnected = false;
          this.isConnecting = false;
          this.attemptReconnect();
        };

        this.ws!.onerror = (error) => {
          console.error('WebSocket error:', error);
          clearTimeout(timeout);
          this.isConnected = false;
          this.isConnecting = false;
          resolve(false);
        };
      });

    } catch (error) {
      console.error('Failed to connect to Playwright Host:', error);
      this.isConnecting = false;
      return false;
    }
  }

  private setupMessageHandlers() {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Playwright Host');
      this.isConnected = false;
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
    };
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);

      if (message.type === 'response') {
        const handler = this.messageHandlers.get(message.id);
        if (handler) {
          handler(message);
          this.messageHandlers.delete(message.id);
        }
      } else if (message.type === 'connected') {
        console.log('Playwright Host connected:', message.message);
      } else if (message.type === 'error') {
        console.error('Playwright Host error:', message.error);
      }
    } catch (error) {
      console.error('Error parsing message from Playwright Host:', error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  async executeAction(action: string, params?: any, timeout = 30000): Promise<PlaywrightResult> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return {
          id: '',
          action,
          success: false,
          error: 'Not connected to Playwright Host'
        };
      }
    }

    const actionId = this.generateActionId();
    const message: PlaywrightAction = {
      id: actionId,
      action,
      params,
      timeout
    };

    return new Promise((resolve) => {
      // 设置超时
      const timeoutHandle = setTimeout(() => {
        this.messageHandlers.delete(actionId);
        resolve({
          id: actionId,
          action,
          success: false,
          error: `Action timeout after ${timeout}ms`
        });
      }, timeout);

      // 设置消息处理器
      this.messageHandlers.set(actionId, (result: PlaywrightResult) => {
        clearTimeout(timeoutHandle);
        resolve(result);
      });

      // 发送消息
      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.messageHandlers.delete(actionId);
        resolve({
          id: actionId,
          action,
          success: false,
          error: `Failed to send message: ${error}`
        });
      }
    });
  }

  async launchBrowser(params?: any): Promise<PlaywrightResult> {
    return this.executeAction('launch', params);
  }

  async navigate(url: string): Promise<PlaywrightResult> {
    return this.executeAction('navigate', { url });
  }

  async click(selector: string, options?: any): Promise<PlaywrightResult> {
    return this.executeAction('click', { selector, options });
  }

  async fill(selector: string, value: string, options?: any): Promise<PlaywrightResult> {
    return this.executeAction('fill', { selector, value, options });
  }

  async type(selector: string, text: string, options?: any): Promise<PlaywrightResult> {
    return this.executeAction('type', { selector, text, options });
  }

  async scroll(selector?: string, direction: 'up' | 'down' = 'down', distance = 500): Promise<PlaywrightResult> {
    return this.executeAction('scroll', { selector, direction, distance });
  }

  async wait(selector?: string, timeout = 10000): Promise<PlaywrightResult> {
    return this.executeAction('wait', { selector, timeout });
  }

  async takeScreenshot(selector?: string, fullPage = true): Promise<PlaywrightResult> {
    return this.executeAction('screenshot', { selector, fullPage });
  }

  async evaluate(script: string, ...args: any[]): Promise<PlaywrightResult> {
    return this.executeAction('evaluate', { script, args });
  }

  async getPageInfo(): Promise<PlaywrightResult> {
    return this.executeAction('getPageInfo');
  }

  async closeBrowser(): Promise<PlaywrightResult> {
    return this.executeAction('close');
  }

  async isHostAvailable(): Promise<boolean> {
    try {
      const result = await this.executeAction('ping');
      return result.success;
    } catch (error) {
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 高级操作方法
  async clickByText(text: string, exact = false): Promise<PlaywrightResult> {
    const selector = exact ? `text="${text}"` : `text=${text}`;
    return this.click(selector);
  }

  async clickByRole(role: string, name?: string): Promise<PlaywrightResult> {
    let selector = `[role="${role}"]`;
    if (name) {
      selector += `[name="${name}"]`;
    }
    return this.click(selector);
  }

  async fillByLabel(label: string, value: string): Promise<PlaywrightResult> {
    const selector = `text="${label}" >> xpath="..//input | ..//textarea"`;
    return this.fill(selector, value);
  }

  async selectOption(selector: string, value: string | string[]): Promise<PlaywrightResult> {
    return this.executeAction('selectOption', { selector, value });
  }

  async hover(selector: string): Promise<PlaywrightResult> {
    return this.executeAction('hover', { selector });
  }

  async dragAndDrop(source: string, target: string): Promise<PlaywrightResult> {
    return this.executeAction('dragAndDrop', { source, target });
  }

  async waitForNavigation(timeout = 30000): Promise<PlaywrightResult> {
    return this.executeAction('waitForNavigation', { timeout });
  }

  async goToBack(): Promise<PlaywrightResult> {
    return this.executeAction('goBack');
  }

  async goForward(): Promise<PlaywrightResult> {
    return this.executeAction('goForward');
  }

  async refresh(): Promise<PlaywrightResult> {
    return this.executeAction('refresh');
  }

  // 获取页面元素信息
  async getElements(selector: string): Promise<PlaywrightResult> {
    return this.executeAction('getElements', { selector });
  }

  async getElementText(selector: string): Promise<PlaywrightResult> {
    return this.executeAction('getElementText', { selector });
  }

  async getElementAttribute(selector: string, attribute: string): Promise<PlaywrightResult> {
    return this.executeAction('getElementAttribute', { selector, attribute });
  }

  async isVisible(selector: string): Promise<PlaywrightResult> {
    return this.executeAction('isVisible', { selector });
  }

  async isEnabled(selector: string): Promise<PlaywrightResult> {
    return this.executeAction('isEnabled', { selector });
  }

  // 表单操作
  async submitForm(selector: string): Promise<PlaywrightResult> {
    return this.executeAction('submitForm', { selector });
  }

  async uploadFile(selector: string, filePath: string): Promise<PlaywrightResult> {
    return this.executeAction('uploadFile', { selector, filePath });
  }

  // 键盘操作
  async press(key: string): Promise<PlaywrightResult> {
    return this.executeAction('press', { key });
  }

  async keyboardType(text: string): Promise<PlaywrightResult> {
    return this.executeAction('keyboardType', { text });
  }

  async down(key: string): Promise<PlaywrightResult> {
    return this.executeAction('keyboardDown', { key });
  }

  async up(key: string): Promise<PlaywrightResult> {
    return this.executeAction('keyboardUp', { key });
  }
}