import { browser } from 'wxt/browser';
import { generateText, tool, generateObject, streamText } from 'ai';
import { ModelProvider, ModelCapabilities } from 'ai';
import { z } from 'zod';

import { AIConfig, AIProviders, getProviderById, getModelById, ModelCapability } from '@/lib/ai-providers';
import { AIService } from '../services/ai-service-v2';
import { PerceptionService } from '../services/perception-service-v2';
import { BrowserTool } from '../tools/browser-tool';
import { MemoryService } from '../services/memory-service';

// 定义 Agent 状态
export enum AgentState {
  IDLE = 'idle',
  THINKING = 'thinking',
  ACTING = 'acting',
  REFLECTING = 'reflecting',
  ERROR = 'error'
}

// 定义任务和步骤
export interface AgentTask {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  steps: AgentStep[];
  result?: any;
  error?: string;
}

export interface AgentStep {
  id: string;
  description: string;
  action: string;
  parameters?: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

// 定义工具调用结构
export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// 定义 Agent 工具
interface AgentTool {
  name: string;
  description: string;
  parameters: z.ZodObject;
  execute: (args: any) => Promise<any>;
}

// 定义 Agent 上下文
export interface AgentContext {
  currentUrl: string;
  pageTitle: string;
  pageContent: string;
  visualElements: any[];
  timestamp: number;
  userIntent?: string;
  sessionHistory: any[];
}

// 定义 Agent 记忆
interface AgentMemory {
  workingMemory: {
    context: AgentContext | null;
    currentTask: AgentTask | null;
    recentActions: any[];
    conversationHistory: any[];
  };
  longTermMemory: {
    userPreferences: Record<string, any>;
    learnedPatterns: any[];
    successfulTasks: any[];
    failedTasks: any[];
  };
}

export class EVAAgentV2 {
  private state: AgentState = AgentState.IDLE;
  private currentTask: AgentTask | null = null;
  private context: AgentContext | null = null;
  private tools: Map<string, AgentTool> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  // 服务依赖
  private aiService: AIService;
  private perceptionService: PerceptionService;
  private memoryService: MemoryService;

  // 配置
  private config: AIConfig | null = null;

  constructor() {
    this.aiService = new AIService();
    this.perceptionService = new PerceptionService();
    this.memoryService = new MemoryService();

    this.registerBuiltinTools();
    this.loadConfiguration();
  }

  private registerBuiltinTools() {
    // 页面交互工具
    this.registerTool({
      name: 'click_element',
      description: 'Click on a web page element',
      parameters: z.object({
        selector: z.string().describe('CSS selector or text content to identify the element'),
        options: z.object({
          waitForVisible: z.boolean().optional().describe('Wait for element to be visible'),
          doubleClick: z.boolean().optional().describe('Perform double click'),
          rightClick: z.boolean().optional().describe('Perform right click'),
          modifiers: z.array(z.string()).optional().describe('Keyboard modifiers like Shift, Ctrl, Alt')
        }).optional()
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.clickElement(args);
      }
    });

    // 输入文本工具
    this.registerTool({
      name: 'type_text',
      description: 'Type text into an input field',
      parameters: z.object({
        selector: z.string().describe('CSS selector or text content to identify the input field'),
        text: z.string().describe('Text to type'),
        options: z.object({
          clearFirst: z.boolean().optional().describe('Clear existing text first'),
          delay: z.number().optional().describe('Delay between characters in ms')
        }).optional()
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.typeText(args);
      }
    });

    // 页面导航工具
    this.registerTool({
      name: 'navigate',
      description: 'Navigate to a URL',
      parameters: z.object({
        url: z.string().url().describe('URL to navigate to'),
        options: z.object({
          waitUntil: z.enum(['domcontentloaded', 'load', 'networkidle']).optional().describe('Wait condition'),
          timeout: z.number().optional().describe('Timeout in ms')
        }).optional()
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.navigate(args);
      }
    });

    // 滚动页面工具
    this.registerTool({
      name: 'scroll_page',
      description: 'Scroll the page',
      parameters: z.object({
        direction: z.enum(['up', 'down', 'left', 'right']).describe('Scroll direction'),
        distance: z.number().optional().describe('Scroll distance in pixels'),
        selector: z.string().optional().describe('CSS selector to bring into view')
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.scrollPage(args);
      }
    });

    // 截图工具
    this.registerTool({
      name: 'take_screenshot',
      description: 'Take a screenshot of the page',
      parameters: z.object({
        fullPage: z.boolean().optional().describe('Take full page screenshot'),
        selector: z.string().optional().describe('CSS selector to screenshot specific element'),
        format: z.enum(['png', 'jpeg', 'webp']).optional().describe('Image format')
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.takeScreenshot(args);
      }
    });

    // 提取页面信息工具
    this.registerTool({
      name: 'extract_content',
      description: 'Extract content from the page',
      parameters: z.object({
        selector: z.string().optional().describe('CSS selector to extract content from'),
        type: z.enum(['text', 'links', 'images', 'forms']).describe('Type of content to extract'),
        maxItems: z.number().optional().describe('Maximum number of items to extract')
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.extractContent(args);
      }
    });

    // 等待元素工具
    this.registerTool({
      name: 'wait_for_element',
      description: 'Wait for an element to appear',
      parameters: z.object({
        selector: z.string().describe('CSS selector of element to wait for'),
        timeout: z.number().optional().describe('Maximum wait time in ms'),
        state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional().describe('Element state condition')
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.waitForElement(args);
      }
    });

    // 检查元素是否存在工具
    this.registerTool({
      name: 'check_element_exists',
      description: 'Check if an element exists on the page',
      parameters: z.object({
        selector: z.string().describe('CSS selector of element to check')
      }),
      execute: async (args) => {
        const browserTool = new BrowserTool();
        return await browserTool.checkElementExists(args);
      }
    });

    // 获取页面信息工具
    this.registerTool({
      name: 'get_page_info',
      description: 'Get information about the current page',
      parameters: z.object({}),
      execute: async () => {
        const browserTool = new BrowserTool();
        return await browserTool.getPageInfo();
      }
    });
  }

  registerTool(tool: AgentTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  async processUserMessage(userMessage: string): Promise<string> {
    try {
      this.setState(AgentState.THINKING);

      // 1. 感知阶段：分析用户意图和页面上下文
      this.setState(AgentState.THINKING);
      const perception = await this.perceiveEnvironment(userMessage);

      // 2. 规划阶段：确定任务和执行步骤
      const task = await this.planTask(userMessage, perception);

      // 3. 执行阶段：执行任务步骤
      const result = await this.executeTask(task);

      // 4. 反思阶段：总结和记忆
      await this.reflectOnTask(task, result);

      this.setState(AgentState.IDLE);
      return result;

    } catch (error) {
      this.setState(AgentState.ERROR);
      console.error('Error processing user message:', error);
      return this.generateErrorResponse(error);
    }
  }

  private async perceiveEnvironment(userMessage: string): Promise<any> {
    return await this.perceptionService.perceive(userMessage, await this.getContext());
  }

  private async planTask(userMessage: string, perception: any): Promise<AgentTask> {
    const task: AgentTask = {
      id: `task_${Date.now()}`,
      description: userMessage,
      priority: this.determinePriority(userMessage),
      status: 'pending',
      createdAt: Date.now(),
      steps: []
    };

    // 使用 AI 进行任务规划
    const planningResult = await this.aiService.planTask(
      userMessage,
      perception,
      this.getAvailableTools(),
      this.getMemory()
    );

    if (planningResult.steps) {
      task.steps = planningResult.steps.map((step, index) => ({
        id: `step_${Date.now()}_${index}`,
        description: step.description,
        action: step.action,
        parameters: step.parameters,
        status: 'pending'
      }));
    }

    this.currentTask = task;
    return task;
  }

  private async executeTask(task: AgentTask): Promise<any> {
    this.currentTask = task;
    task.status = 'in_progress';

    const results = [];

    for (const step of task.steps) {
      try {
        step.status = 'in_progress';
        step.startTime = Date.now();

        const tool = this.getTool(step.action);
        if (!tool) {
          throw new Error(`Unknown tool: ${step.action}`);
        }

        const result = await tool.execute(step.parameters);

        step.status = 'completed';
        step.result = result;
        step.endTime = Date.now();

        results.push({
          stepId: step.id,
          action: step.action,
          result,
          success: true
        });

      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : String(error);
        step.endTime = Date.now();

        results.push({
          stepId: step.id,
          action: step.action,
          error: step.error,
          success: false
        });

        // 可以选择继续或停止执行
        break;
      }
    }

    task.status = results.every(r => r.success) ? 'completed' : 'failed';
    task.completedAt = Date.now();
    task.result = results;

    return results;
  }

  private async reflectOnTask(task: AgentTask, results: any): Promise<void> {
    // 记录任务到记忆中
    if (task.status === 'completed') {
      this.memoryService.addSuccessfulTask({
        task,
        results,
        timestamp: Date.now()
      });
    } else {
      this.memoryService.addFailedTask({
        task,
        results,
        error: task.error,
        timestamp: Date.now()
      });
    }

    // 生成反思总结
    const reflection = await this.aiService.reflectOnTask(task, results);

    if (reflection.learnings) {
      for (const learning of reflection.learnings) {
        this.memoryService.addLearningPattern(learning);
      }
    }
  }

  private async getContext(): Promise<AgentContext> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab || !currentTab.id) {
      throw new Error('No active tab found');
    }

    // 使用内容脚本获取页面信息
    const results = await browser.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        return {
          url: window.location.href,
          title: document.title,
          content: document.body.innerText.substring(0, 5000), // 限制内容长度
          elements: Array.from(document.querySelectorAll('*')).slice(0, 100).map(el => ({
            tagName: el.tagName,
            text: el.textContent?.substring(0, 100) || '',
            id: el.id || '',
            className: el.className || '',
            visible: el.offsetParent !== null
          })),
          timestamp: Date.now()
        };
      }
    });

    const pageData = results[0]?.result || {
      url: '',
      title: '',
      content: '',
      elements: [],
      timestamp: Date.now()
    };

    return {
      currentUrl: pageData.url,
      pageTitle: pageData.title,
      pageContent: pageData.content,
      visualElements: pageData.elements,
      timestamp: pageData.timestamp
    };
  }

  private getMemory(): AgentMemory {
    return this.memoryService.getMemory();
  }

  private setState(newState: AgentState): void {
    this.state = newState;
    this.notifyListeners('stateChanged', { state: newState });
  }

  // 事件监听器管理
  public addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private generateErrorResponse(error: any): string {
    return `抱歉，我在处理您的请求时遇到了问题：${error.message || '未知错误'}`;
  }

  private determinePriority(userMessage: string): AgentTask['priority'] {
    const message = userMessage.toLowerCase();

    if (message.includes('紧急') || message.includes('urgent')) {
      return 'urgent';
    } else if (message.includes('重要') || message.includes('important')) {
      return 'high';
    } else if (message.includes('麻烦') || message.includes('help')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // 配置管理
  async loadConfiguration(): Promise<void> {
    try {
      const data = await browser.storage.local.get(['activeAIConfig', 'aiConfigs']);

      if (data.activeAIConfig) {
        this.config = data.activeAIConfig;
      } else {
        // 使用第一个可用的配置
        const configs = data.aiConfigs || [];
        if (configs.length > 0) {
          this.config = configs[0];
        }
      }

      // 如果有配置，初始化AI服务
      if (this.config) {
        await this.aiService.initialize(this.config);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  async updateConfiguration(config: AIConfig): Promise<void> {
    try {
      this.config = config;
      await this.aiService.initialize(config);

      // 保存到存储
      const data = await browser.storage.local.get('aiConfigs');
      const configs = data.aiConfigs || [];
      const updatedConfigs = configs.map(c =>
        c.id === this.config?.id ? config : c
      );

      // 如果配置不存在，添加它
      if (!configs.some(c => c.id === config.id)) {
        updatedConfigs.push(config);
      }

      await browser.storage.local.set({
        aiConfigs: updatedConfigs,
        activeAIConfig: config
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
    }
  }

  getCurrentConfiguration(): AIConfig | null {
    return this.config;
  }

  // 状态查询
  getState(): AgentState {
    return this.state;
  }

  getCurrentTask(): AgentTask | null {
    return this.currentTask;
  }

  isIdle(): boolean {
    return this.state === AgentState.IDLE;
  }

  isThinking(): boolean {
    return this.state === AgentState.THINKING;
  }

  isActing(): boolean {
    return this.state === AgentState.ACTING;
  }
}