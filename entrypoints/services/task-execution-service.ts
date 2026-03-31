import { Task, TaskStep, MessageType, MessageFrom } from '@/entrypoints/types';
import { browser } from 'wxt/browser';
import { ContentScriptBrowserService } from './content-script-browser-service';

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
  private browserService: ContentScriptBrowserService;

  static getInstance(): TaskExecutionService {
    if (!TaskExecutionService.instance) {
      TaskExecutionService.instance = new TaskExecutionService();
      TaskExecutionService.instance.browserService = ContentScriptBrowserService.getInstance();
    }
    return TaskExecutionService.instance;
  }

  async executeTask(task: Task): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    this.activeTasks.set(task.id, { ...task, status: 'running' });

    try {
      return await this.executeTaskWithBrowserService(task, startTime);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);
      this.activeTasks.delete(task.id);
      return { success: false, taskId: task.id, stepResults: [], totalExecutionTime: Date.now() - startTime };
    }
  }

  private async executeTaskWithBrowserService(task: Task, startTime: number): Promise<TaskExecutionResult> {
    const stepResults = [];

    try {
      const tabId = await this.browserService.getActiveTabId();
      await this.browserService.ensureContentScript(tabId);

      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        step.status = 'running';
        await this.notifyTaskUpdate(task);

        const result = await this.executeStep(step);
        stepResults.push({ stepId: step.id, success: result.success, error: result.error, data: result.result });

        if (result.success) {
          step.status = 'completed';
          step.result = result.result;
        } else {
          step.status = 'failed';
          step.result = { error: result.error };
          task.status = 'failed';
          await this.notifyTaskUpdate(task);
          this.activeTasks.delete(task.id);
          return { success: false, taskId: task.id, stepResults, totalExecutionTime: Date.now() - startTime };
        }

        await this.notifyTaskUpdate(task);
        if (i < task.steps.length - 1) await this.sleep(500);
      }

      task.status = 'completed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);
      this.activeTasks.delete(task.id);
      return { success: true, taskId: task.id, stepResults, totalExecutionTime: Date.now() - startTime };
    } catch (error) {
      task.status = 'failed';
      task.completedAt = Date.now();
      await this.notifyTaskUpdate(task);
      this.activeTasks.delete(task.id);
      return { success: false, taskId: task.id, stepResults, totalExecutionTime: Date.now() - startTime };
    }
  }

  private async executeStep(step: TaskStep): Promise<{ success: boolean; result?: unknown; error?: string }> {
    try {
      return await this.mapStepToBrowserAction(step);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async mapStepToBrowserAction(step: TaskStep): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const { action, target, value } = step;

    switch (action) {
      case 'navigate':
        return value ? this.browserService.navigate(value) : { success: false, error: 'Navigate requires a URL' };
      case 'click':
        return target ? this.browserService.click(this.convertToSelector(target)) : { success: false, error: 'Click requires a target' };
      case 'fill':
      case 'type':
        return target && value ? this.browserService.fill(this.convertToSelector(target), value) : { success: false, error: 'Fill/Type requires target and value' };
      case 'scroll':
        return target ? this.browserService.scroll(this.convertToSelector(target)) : this.browserService.scroll();
      case 'wait':
        if (target) return this.browserService.wait(this.convertToSelector(target));
        if (value) { const t = parseInt(value); return this.browserService.wait(undefined, isNaN(t) ? 10000 : t); }
        return this.browserService.wait(undefined, 5000);
      case 'extract':
        return target ? this.browserService.extract(this.convertToSelector(target)) : { success: false, error: 'Extract requires a target' };
      case 'screenshot':
        return this.browserService.takeScreenshot();
      case 'hover':
        return target ? this.browserService.hover(this.convertToSelector(target)) : { success: false, error: 'Hover requires a target' };
      case 'select':
        return target && value ? this.browserService.selectOption(this.convertToSelector(target), value) : { success: false, error: 'Select requires target and value' };
      default:
        return { success: false, error: `Unsupported action: ${action}` };
    }
  }

  private convertToSelector(selector: any): string {
    if (!selector) return '';
    switch (selector.type) {
      case 'css': return selector.value;
      case 'xpath': return `xpath=${selector.value}`;
      case 'text': return `text="${selector.value}"`;
      case 'aria-label': return `[aria-label="${selector.value}"]`;
      default: return selector.value;
    }
  }

  private async notifyTaskUpdate(task: Task): Promise<void> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, { messageType: MessageType.taskResult, task });
      }
    } catch (error) {
      console.error("Error notifying task update:", error);
    }
  }

  async stopTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;
    task.status = 'failed';
    await this.notifyTaskUpdate(task);
    this.activeTasks.delete(taskId);
    return true;
  }

  getActiveTasks(): Task[] { return Array.from(this.activeTasks.values()); }
  getTask(taskId: string): Task | null { return this.activeTasks.get(taskId) || null; }
  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

  async analyzeCurrentPage(): Promise<any> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) throw new Error("No active tab found");
      const tabId = tabs[0].id;
      await this.browserService.ensureContentScript(tabId);
      return await this.browserService.getPageInfo();
    } catch (error) {
      console.error("Error analyzing page:", error);
      return { interactiveElements: [] };
    }
  }

  async highlightElement(selector: any): Promise<boolean> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) return false;
      await this.browserService.ensureContentScript(tabs[0].id);
      const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'highlightElement', selector });
      return response?.success || false;
    } catch { return false; }
  }

  async removeHighlight(): Promise<boolean> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) return false;
      await this.browserService.ensureContentScript(tabs[0].id);
      const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'removeHighlight' });
      return response?.success || false;
    } catch { return false; }
  }
}
