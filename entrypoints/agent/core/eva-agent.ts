import { browser } from 'wxt/browser';
import {
  AgentCapability,
  AgentState,
  AgentGoal,
  AgentPerception,
  AgentAction,
  AgentPlan,
  AgentMemory,
  AgentContext,
  AgentTool
} from './agent-types';
import { AIService } from '../services/ai-service';
import { PerceptionService } from '../services/perception-service';
import { PlanningService } from '../services/planning-service';
import { ToolRegistry } from '../services/tool-registry';
import { MemoryService } from '../services/memory-service';

export class EVAAgent {
  private state: AgentState = AgentState.IDLE;
  private currentGoal: AgentGoal | null = null;
  private currentPlan: AgentPlan | null = null;
  private memory: AgentMemory;
  private context: AgentContext | null = null;
  private capabilities: Set<AgentCapability>;

  // 服务依赖
  private aiService: AIService;
  private perceptionService: PerceptionService;
  private planningService: PlanningService;
  private toolRegistry: ToolRegistry;
  private memoryService: MemoryService;

  // 事件监听器
  private stateChangeListeners: Array<(state: AgentState) => void> = [];
  private perceptionListeners: Array<(perception: AgentPerception) => void> = [];
  private actionListeners: Array<(action: AgentAction) => void> = [];

  constructor() {
    this.memory = {
      shortTerm: {
        currentContext: null,
        recentActions: [],
        conversationHistory: []
      },
      longTerm: {
        userPreferences: {},
        learnedPatterns: [],
        toolUsage: {},
        successHistory: []
      }
    };

    this.capabilities = new Set([
      AgentCapability.VISUAL_PERCEPTION,
      AgentCapability.TEXT_UNDERSTANDING,
      AgentCapability.ACTION_PLANNING,
      AgentCapability.TOOL_EXECUTION,
      AgentCapability.CONTEXT_AWARENESS,
      AgentCapability.CONVERSATION
    ]);

    this.initializeServices();
    this.loadMemory();
  }

  private initializeServices() {
    this.aiService = new AIService();
    this.perceptionService = new PerceptionService();
    this.planningService = new PlanningService();
    this.toolRegistry = new ToolRegistry();
    this.memoryService = new MemoryService();

    // 注册内置工具
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // 页面交互工具
    this.toolRegistry.register({
      name: 'click_element',
      description: '点击页面元素',
      capabilities: [AgentCapability.TOOL_EXECUTION],
      parameters: { selector: 'string', options: 'object' },
      execute: async (params) => this.executeClick(params)
    });

    // 文本输入工具
    this.toolRegistry.register({
      name: 'type_text',
      description: '在输入框中输入文本',
      capabilities: [AgentCapability.TOOL_EXECUTION],
      parameters: { selector: 'string', text: 'string', options: 'object' },
      execute: async (params) => this.executeType(params)
    });

    // 页面导航工具
    this.toolRegistry.register({
      name: 'navigate',
      description: '导航到指定URL',
      capabilities: [AgentCapability.TOOL_EXECUTION],
      parameters: { url: 'string', options: 'object' },
      execute: async (params) => this.executeNavigate(params)
    });

    // 视觉感知工具
    this.toolRegistry.register({
      name: 'analyze_page',
      description: '分析当前页面',
      capabilities: [AgentCapability.VISUAL_PERCEPTION],
      parameters: { depth: 'number' },
      execute: async (params) => this.analyzePage(params)
    });

    // 截图工具
    this.toolRegistry.register({
      name: 'screenshot',
      description: '截取页面或元素截图',
      capabilities: [AgentCapability.VISUAL_PERCEPTION],
      parameters: { selector: 'string', fullPage: 'boolean' },
      execute: async (params) => this.takeScreenshot(params)
    });

    // 对话工具
    this.toolRegistry.register({
      name: 'conversation',
      description: '与用户进行对话',
      capabilities: [AgentCapability.CONVERSATION],
      parameters: { message: 'string', context: 'object' },
      execute: async (params) => this.handleConversation(params)
    });
  }

  // 主要的 Agent 循环
  async processUserInput(userInput: string, context?: Partial<AgentContext>): Promise<any> {
    try {
      this.setState(AgentState.PERCEIVING);

      // 1. 感知环境和用户意图
      const perceptions = await this.perceive(userInput, context);

      // 2. 理解用户目标
      const goal = await this.understandGoal(userInput, perceptions);

      // 3. 制定计划
      const plan = await this.createPlan(goal, perceptions);

      // 4. 执行计划
      const result = await this.executePlan(plan);

      // 5. 反思和学习
      await this.reflect(goal, plan, result);

      return result;

    } catch (error) {
      this.setState(AgentState.ERROR);
      console.error('Agent processing error:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: await this.generateFallbackResponse(userInput)
      };
    }
  }

  private async perceive(userInput: string, context?: Partial<AgentContext>): Promise<AgentPerception[]> {
    this.setState(AgentState.PERCEIVING);

    const perceptions: AgentPerception[] = [];

    // 获取当前页面上下文
    const currentContext = await this.updateContext(context);
    this.context = currentContext;

    // 文本感知
    const textPerception = await this.perceptionService.perceiveText(userInput, currentContext);
    if (textPerception) {
      perceptions.push(textPerception);
    }

    // 视觉感知
    const visualPerception = await this.perceptionService.perceiveVisual(currentContext);
    if (visualPerception) {
      perceptions.push(visualPerception);
    }

    // 上下文感知
    const contextPerception = await this.perceptionService.perceiveContext(currentContext);
    if (contextPerception) {
      perceptions.push(contextPerception);
    }

    // 用户意图感知
    const intentPerception = await this.perceptionService.perceiveUserIntent(userInput, currentContext);
    if (intentPerception) {
      perceptions.push(intentPerception);
    }

    // 通知感知监听器
    perceptions.forEach(perception => {
      this.perceptionListeners.forEach(listener => listener(perception));
    });

    return perceptions;
  }

  private async understandGoal(userInput: string, perceptions: AgentPerception[]): Promise<AgentGoal> {
    const goalAnalysis = await this.aiService.analyzeGoal(userInput, perceptions, this.memory);

    const goal: AgentGoal = {
      id: `goal_${Date.now()}`,
      description: goalAnalysis.description,
      priority: goalAnalysis.priority || 1,
      constraints: goalAnalysis.constraints,
      successCriteria: goalAnalysis.successCriteria
    };

    this.currentGoal = goal;
    return goal;
  }

  private async createPlan(goal: AgentGoal, perceptions: AgentPerception[]): Promise<AgentPlan> {
    this.setState(AgentState.PLANNING);

    const planningContext = {
      goal,
      perceptions,
      context: this.context,
      memory: this.memory,
      availableTools: this.toolRegistry.getAvailableTools()
    };

    const plan = await this.planningService.createPlan(planningContext);
    this.currentPlan = plan;

    return plan;
  }

  private async executePlan(plan: AgentPlan): Promise<any> {
    this.setState(AgentState.EXECUTING);

    const results = [];

    for (const step of plan.steps) {
      try {
        const result = await this.executeAction(step);
        results.push({ step: step.id, result, success: true });

        // 更新短期记忆
        this.memory.shortTerm.recentActions.push(step);

        // 通知动作监听器
        this.actionListeners.forEach(listener => listener(step));

      } catch (error) {
        results.push({ step: step.id, error: error.message, success: false });

        // 如果步骤失败，尝试备选方案
        if (plan.alternatives.length > 0) {
          console.log('Primary action failed, trying alternatives...');
          // 实现备选方案逻辑
        }
      }
    }

    return {
      success: results.every(r => r.success),
      results,
      plan: plan
    };
  }

  private async executeAction(action: AgentAction): Promise<any> {
    const tool = this.toolRegistry.get(action.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${action.tool}`);
    }

    // 验证参数
    if (tool.validate && !tool.validate(action.parameters)) {
      throw new Error(`Invalid parameters for tool: ${action.tool}`);
    }

    // 执行工具
    const result = await tool.execute(action.parameters);

    // 更新工具使用统计
    this.memory.longTerm.toolUsage[action.tool] =
      (this.memory.longTerm.toolUsage[action.tool] || 0) + 1;

    return result;
  }

  private async reflect(goal: AgentGoal, plan: AgentPlan, result: any): Promise<void> {
    this.setState(AgentState.REFLECTING);

    // 分析执行结果
    const reflection = await this.aiService.reflect({
      goal,
      plan,
      result,
      context: this.context,
      memory: this.memory
    });

    // 更新长期记忆
    if (result.success) {
      this.memory.longTerm.successHistory.push({
        goal,
        plan,
        result,
        timestamp: Date.now()
      });
    }

    // 学习和适应
    if (reflection.learnings) {
      this.memory.longTerm.learnedPatterns.push(...reflection.learnings);
    }

    // 保存记忆
    await this.saveMemory();

    this.setState(AgentState.IDLE);
  }

  private async updateContext(context?: Partial<AgentContext>): Promise<AgentContext> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab || !currentTab.id) {
      throw new Error('No active tab found');
    }

    // 获取页面信息
    const pageInfo = await this.getPageInfo(currentTab.id);

    return {
      currentUrl: currentTab.url || '',
      pageTitle: currentTab.title || '',
      pageContent: pageInfo.content || '',
      visualElements: pageInfo.elements || [],
      sessionHistory: this.memory.shortTerm.conversationHistory,
      environmentalFactors: {
        deviceType: 'desktop', // 可以通过用户代理检测
        browserInfo: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        currentTime: Date.now()
      },
      ...context
    };
  }

  private async getPageInfo(tabId: number): Promise<any> {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            content: document.body.innerText,
            elements: Array.from(document.querySelectorAll('*')).map(el => ({
              tagName: el.tagName,
              text: el.textContent?.substring(0, 100),
              id: el.id,
              className: el.className,
              visible: el.offsetParent !== null
            }))
          };
        }
      });

      return results[0].result;
    } catch (error) {
      console.error('Error getting page info:', error);
      return {};
    }
  }

  // 工具执行方法
  private async executeClick(params: any): Promise<any> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].id) {
      throw new Error('No active tab found');
    }

    await browser.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (selector: string, options: any) => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            element.click();
          }, 500);
          return true;
        }
        return false;
      },
      args: [params.selector, params.options]
    });

    return { success: true, action: 'clicked', selector: params.selector };
  }

  private async executeType(params: any): Promise<any> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].id) {
      throw new Error('No active tab found');
    }

    await browser.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (selector: string, text: string) => {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (element) {
          element.focus();
          element.value = text;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      },
      args: [params.selector, params.text]
    });

    return { success: true, action: 'typed', selector: params.selector, text: params.text };
  }

  private async executeNavigate(params: any): Promise<any> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].id) {
      throw new Error('No active tab found');
    }

    await browser.tabs.update(tabs[0].id, { url: params.url });

    return { success: true, action: 'navigated', url: params.url };
  }

  private async analyzePage(params: any): Promise<any> {
    if (!this.context) {
      throw new Error('No context available');
    }

    const analysis = await this.aiService.analyzePage(this.context, params.depth || 1);
    return analysis;
  }

  private async takeScreenshot(params: any): Promise<any> {
    // 这里可以集成 Playwright 或其他截图工具
    return { success: true, action: 'screenshot_taken', params };
  }

  private async handleConversation(params: any): Promise<any> {
    const response = await this.aiService.converse(params.message, {
      context: this.context,
      memory: this.memory,
      history: this.memory.shortTerm.conversationHistory
    });

    // 更新对话历史
    this.memory.shortTerm.conversationHistory.push({
      type: 'user',
      content: params.message,
      timestamp: Date.now()
    });

    this.memory.shortTerm.conversationHistory.push({
      type: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    return response;
  }

  private async generateFallbackResponse(userInput: string): Promise<string> {
    return `抱歉，我遇到了一些技术问题。不过我注意到您提到了"${userInput}"，让我尝试用其他方式帮助您。`;
  }

  // 状态管理
  private setState(newState: AgentState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stateChangeListeners.forEach(listener => listener(newState));
      console.log(`Agent state changed: ${oldState} -> ${newState}`);
    }
  }

  // 事件监听器管理
  public onStateChange(listener: (state: AgentState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  public onPerception(listener: (perception: AgentPerception) => void): void {
    this.perceptionListeners.push(listener);
  }

  public onAction(listener: (action: AgentAction) => void): void {
    this.actionListeners.push(listener);
  }

  // 记忆管理
  private async loadMemory(): Promise<void> {
    try {
      const data = await browser.storage.local.get('evaAgentMemory');
      if (data.evaAgentMemory) {
        this.memory = data.evaAgentMemory;
      }
    } catch (error) {
      console.error('Error loading agent memory:', error);
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      await browser.storage.local.set({ evaAgentMemory: this.memory });
    } catch (error) {
      console.error('Error saving agent memory:', error);
    }
  }

  // 公共接口
  public getState(): AgentState {
    return this.state;
  }

  public getCurrentGoal(): AgentGoal | null {
    return this.currentGoal;
  }

  public getCurrentPlan(): AgentPlan | null {
    return this.currentPlan;
  }

  public getMemory(): AgentMemory {
    return this.memory;
  }

  public getContext(): AgentContext | null {
    return this.context;
  }

  public hasCapability(capability: AgentCapability): boolean {
    return this.capabilities.has(capability);
  }

  public addCapability(capability: AgentCapability): void {
    this.capabilities.add(capability);
  }

  public removeCapability(capability: AgentCapability): void {
    this.capabilities.delete(capability);
  }
}