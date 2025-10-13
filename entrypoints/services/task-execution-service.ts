import { Task, TaskStep, MessageType, MessageFrom } from '@/entrypoints/types';
import { browser } from 'wxt/browser';
import { PlaywrightService } from './playwright-service';

export interface TaskExecutionResult {
  success: boolean;
  taskId: string;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    error?: string;
    data?: any;
  }>;
  totalExecutionTime: number;
}

export class TaskExecutionService {
  private static instance: TaskExecutionService;
  private activeTasks: Map<string, Task> = new Map();
  private executionCallbacks: Map<string, (result: TaskExecutionResult) => void> = new Map();
  private playwrightService: PlaywrightService;

  static getInstance(): TaskExecutionService {
    if (!TaskExecutionService.instance) {
      TaskExecutionService.instance = new TaskExecutionService();
      TaskExecutionService.instance.playwrightService = PlaywrightService.getInstance();
    }
    return TaskExecutionService.instance;
  }

  async executeTask(task: Task): Promise<TaskExecutionResult> {
    const startTime = Date.now();

    // 保存任务到活动任务列表
    this.activeTasks.set(task.id, { ...task, status: 'running' });

    try {
      const stepResults = [];

      // 检查是否需要使用 Playwright
      const usePlaywright = (task as any).usePlaywright || task.steps.some(step => step.playwrightAction);

      if (usePlaywright) {
        // 使用 Playwright 执行任务
        return await this.executeTaskWithPlaywright(task, startTime);
      } else {
        // 使用原有的内容脚本方式执行任务
        return await this.executeTaskWithContentScript(task, startTime);
      }

    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);

      const executionResult: TaskExecutionResult = {
        success: false,
        taskId: task.id,
        stepResults: [],
        totalExecutionTime: Date.now() - startTime
      };

      this.activeTasks.delete(task.id);
      return executionResult;
    }
  }

  // 使用 Playwright 执行任务
  private async executeTaskWithPlaywright(task: Task, startTime: number): Promise<TaskExecutionResult> {
    const stepResults = [];

    try {
      // 确保 Playwright 服务已连接
      const isConnected = await this.playwrightService.connect();
      if (!isConnected) {
        throw new Error("无法连接到 Playwright Host 服务");
      }

      // 逐个执行步骤
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];

        // 更新步骤状态
        step.status = 'running';
        await this.notifyTaskUpdate(task);

        // 执行步骤
        const result = await this.executeStepWithPlaywright(step);

        stepResults.push({
          stepId: step.id,
          success: result.success,
          error: result.error,
          data: result.result
        });

        if (result.success) {
          step.status = 'completed';
          step.result = result.result;
        } else {
          step.status = 'failed';
          step.result = { error: result.error };

          // 如果步骤失败，停止执行
          task.status = 'failed';
          await this.notifyTaskUpdate(task);

          const executionResult: TaskExecutionResult = {
            success: false,
            taskId: task.id,
            stepResults,
            totalExecutionTime: Date.now() - startTime
          };

          this.activeTasks.delete(task.id);
          return executionResult;
        }

        await this.notifyTaskUpdate(task);

        // 在步骤之间添加短暂延迟
        if (i < task.steps.length - 1) {
          await this.sleep(1000);
        }
      }

      // 所有步骤成功完成
      task.status = 'completed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);

      const executionResult: TaskExecutionResult = {
        success: true,
        taskId: task.id,
        stepResults,
        totalExecutionTime: Date.now() - startTime
      };

      this.activeTasks.delete(task.id);
      return executionResult;

    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);

      const executionResult: TaskExecutionResult = {
        success: false,
        taskId: task.id,
        stepResults,
        totalExecutionTime: Date.now() - startTime
      };

      this.activeTasks.delete(task.id);
      return executionResult;
    }
  }

  // 使用内容脚本执行任务（原有逻辑）
  private async executeTaskWithContentScript(task: Task, startTime: number): Promise<TaskExecutionResult> {
    const stepResults = [];

    try {
      // 获取当前活动标签页
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) {
        throw new Error("No active tab found");
      }

      const tabId = tabs[0].id;

      // 确保内容脚本已注入
      await this.ensureContentScriptInjected(tabId);

      // 逐个执行步骤
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];

        // 更新步骤状态
        step.status = 'running';
        await this.notifyTaskUpdate(task);

        // 执行步骤
        const result = await this.executeStep(step, tabId);

        stepResults.push({
          stepId: step.id,
          success: result.success,
          error: result.error,
          data: result.data
        });

        if (result.success) {
          step.status = 'completed';
          step.result = result.data;
        } else {
          step.status = 'failed';
          step.result = { error: result.error };

          // 如果步骤失败，停止执行
          task.status = 'failed';
          await this.notifyTaskUpdate(task);

          const executionResult: TaskExecutionResult = {
            success: false,
            taskId: task.id,
            stepResults,
            totalExecutionTime: Date.now() - startTime
          };

          this.activeTasks.delete(task.id);
          return executionResult;
        }

        await this.notifyTaskUpdate(task);

        // 在步骤之间添加短暂延迟
        if (i < task.steps.length - 1) {
          await this.sleep(500);
        }
      }

      // 所有步骤成功完成
      task.status = 'completed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);

      const executionResult: TaskExecutionResult = {
        success: true,
        taskId: task.id,
        stepResults,
        totalExecutionTime: Date.now() - startTime
      };

      this.activeTasks.delete(task.id);
      return executionResult;

    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);

      const executionResult: TaskExecutionResult = {
        success: false,
        taskId: task.id,
        stepResults: [],
        totalExecutionTime: Date.now() - startTime
      };

      this.activeTasks.delete(task.id);
      return executionResult;
    }
  }

  private async ensureContentScriptInjected(tabId: number): Promise<void> {
    try {
      // 尝试向内容脚本发送ping消息
      const response = await browser.tabs.sendMessage(tabId, { action: 'ping' });

      if (!response) {
        // 如果没有响应，注入内容脚本
        await browser.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });

        // 等待脚本加载
        await this.sleep(1000);
      }
    } catch (error) {
      // 内容脚本未注入，进行注入
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      await this.sleep(1000);
    }
  }

  private async executeStep(step: TaskStep, tabId: number): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // 向内容脚本发送执行步骤的消息
      const response = await browser.tabs.sendMessage(tabId, {
        action: 'executeStep',
        step: step
      });

      return response || { success: false, error: 'No response from content script' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async notifyTaskUpdate(task: Task): Promise<void> {
    try {
      // 通知侧边栏任务状态更新
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          messageType: MessageType.taskResult,
          task: task
        });
      }
    } catch (error) {
      console.error("Error notifying task update:", error);
    }
  }

  async stopTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = 'failed';
    await this.notifyTaskUpdate(task);
    this.activeTasks.delete(taskId);

    return true;
  }

  getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  getTask(taskId: string): Task | null {
    return this.activeTasks.get(taskId) || null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 使用 Playwright 执行单个步骤
  private async executeStepWithPlaywright(step: TaskStep): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      let result;

      // 如果步骤有指定的 Playwright 操作，使用它
      if (step.playwrightAction && step.playwrightParams) {
        result = await this.playwrightService.executeAction(
          step.playwrightAction,
          step.playwrightParams
        );
      } else {
        // 否则根据步骤类型映射到相应的 Playwright 操作
        result = await this.mapStepToPlaywrightAction(step);
      }

      return {
        success: result.success,
        result: result.result,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 将步骤类型映射到 Playwright 操作
  private async mapStepToPlaywrightAction(step: TaskStep): Promise<any> {
    const { action, target, value } = step;

    switch (action) {
      case 'navigate':
        if (value) {
          return await this.playwrightService.navigate(value);
        }
        throw new Error("Navigate action requires a URL value");

      case 'click':
        if (target) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.click(selector);
        }
        throw new Error("Click action requires a target");

      case 'fill':
      case 'type':
        if (target && value) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.fill(selector, value);
        }
        throw new Error("Fill/Type action requires both target and value");

      case 'scroll':
        if (target) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.scroll(selector);
        } else {
          return await this.playwrightService.scroll();
        }

      case 'wait':
        if (target) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.wait(selector);
        } else if (value) {
          const timeout = parseInt(value);
          return await this.playwrightService.wait(undefined, isNaN(timeout) ? 10000 : timeout);
        } else {
          return await this.playwrightService.wait(undefined, 5000);
        }

      case 'extract':
        if (target) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.getElementText(selector);
        }
        throw new Error("Extract action requires a target");

      case 'screenshot':
        if (target) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.takeScreenshot(selector);
        } else {
          return await this.playwrightService.takeScreenshot();
        }

      case 'hover':
        if (target) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.hover(selector);
        }
        throw new Error("Hover action requires a target");

      case 'select':
        if (target && value) {
          const selector = this.convertToSelector(target);
          return await this.playwrightService.selectOption(selector, value);
        }
        throw new Error("Select action requires both target and value");

      default:
        throw new Error(`Unsupported action for Playwright: ${action}`);
    }
  }

  // 将 ElementSelector 转换为 Playwright 选择器字符串
  private convertToSelector(selector: any): string {
    if (!selector) return '';

    switch (selector.type) {
      case 'css':
        return selector.value;
      case 'xpath':
        return `xpath=${selector.value}`;
      case 'text':
        return `text="${selector.value}"`;
      case 'aria-label':
        return `[aria-label="${selector.value}"]`;
      default:
        return selector.value;
    }
  }

  // 页面分析功能
  async analyzeCurrentPage(): Promise<any> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) {
        throw new Error("No active tab found");
      }

      const tabId = tabs[0].id;

      // 确保内容脚本已注入
      await this.ensureContentScriptInjected(tabId);

      // 请求页面分析
      const response = await browser.tabs.sendMessage(tabId, {
        action: 'analyzePage'
      });

      return response;
    } catch (error) {
      console.error("Error analyzing page:", error);
      return { interactiveElements: [] };
    }
  }

  // 高亮元素
  async highlightElement(selector: any): Promise<boolean> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) {
        return false;
      }

      const tabId = tabs[0].id;
      await this.ensureContentScriptInjected(tabId);

      const response = await browser.tabs.sendMessage(tabId, {
        action: 'highlightElement',
        selector: selector
      });

      return response?.success || false;
    } catch (error) {
      console.error("Error highlighting element:", error);
      return false;
    }
  }

  // 移除高亮
  async removeHighlight(): Promise<boolean> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) {
        return false;
      }

      const tabId = tabs[0].id;
      await this.ensureContentScriptInjected(tabId);

      const response = await browser.tabs.sendMessage(tabId, {
        action: 'removeHighlight'
      });

      return response?.success || false;
    } catch (error) {
      console.error("Error removing highlight:", error);
      return false;
    }
  }
}