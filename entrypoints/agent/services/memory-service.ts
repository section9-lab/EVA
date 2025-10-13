import { browser } from 'wxt/browser';
import { AgentMemory } from '../core/agent-types';

export class MemoryService {
  private memory: AgentMemory;
  private maxShortTermSize = 50;
  private maxLongTermSize = 1000;

  constructor() {
    this.memory = this.getDefaultMemory();
    this.loadMemory();
  }

  private getDefaultMemory(): AgentMemory {
    return {
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
  }

  // 短期记忆管理
  addToRecentActions(action: any): void {
    this.memory.shortTerm.recentActions.push({
      ...action,
      timestamp: Date.now()
    });

    // 限制大小
    if (this.memory.shortTerm.recentActions.length > this.maxShortTermSize) {
      this.memory.shortTerm.recentActions.shift();
    }

    this.saveMemory();
  }

  addToConversationHistory(message: any): void {
    this.memory.shortTerm.conversationHistory.push({
      ...message,
      timestamp: Date.now()
    });

    // 限制大小
    if (this.memory.shortTerm.conversationHistory.length > this.maxShortTermSize) {
      this.memory.shortTerm.conversationHistory.shift();
    }

    this.saveMemory();
  }

  updateCurrentContext(context: any): void {
    this.memory.shortTerm.currentContext = {
      ...context,
      timestamp: Date.now()
    };

    this.saveMemory();
  }

  getRecentActions(limit: number = 10): any[] {
    return this.memory.shortTerm.recentActions.slice(-limit);
  }

  getConversationHistory(limit: number = 20): any[] {
    return this.memory.shortTerm.conversationHistory.slice(-limit);
  }

  getCurrentContext(): any {
    return this.memory.shortTerm.currentContext;
  }

  clearShortTermMemory(): void {
    this.memory.shortTerm = {
      currentContext: null,
      recentActions: [],
      conversationHistory: []
    };
    this.saveMemory();
  }

  // 长期记忆管理
  updateUserPreferences(preferences: Record<string, any>): void {
    this.memory.longTerm.userPreferences = {
      ...this.memory.longTerm.userPreferences,
      ...preferences,
      lastUpdated: Date.now()
    };

    this.saveMemory();
  }

  getUserPreferences(): Record<string, any> {
    return this.memory.longTerm.userPreferences;
  }

  addLearnedPattern(pattern: any): void {
    this.memory.longTerm.learnedPatterns.push({
      ...pattern,
      learnedAt: Date.now(),
      usageCount: 0
    });

    // 限制大小
    if (this.memory.longTerm.learnedPatterns.length > this.maxLongTermSize) {
      // 移除最少使用的模式
      this.memory.longTerm.learnedPatterns.sort((a, b) => a.usageCount - b.usageCount);
      this.memory.longTerm.learnedPatterns.shift();
    }

    this.saveMemory();
  }

  getLearnedPatterns(context?: string): any[] {
    if (!context) {
      return this.memory.longTerm.learnedPatterns;
    }

    return this.memory.longTerm.learnedPatterns.filter(pattern =>
      pattern.context === context ||
      pattern.keywords?.some((keyword: string) => context.includes(keyword))
    );
  }

  updateToolUsage(toolName: string, success: boolean): void {
    if (!this.memory.longTerm.toolUsage[toolName]) {
      this.memory.longTerm.toolUsage[toolName] = {
        totalUsage: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: Date.now()
      };
    }

    const usage = this.memory.longTerm.toolUsage[toolName];
    usage.totalUsage++;
    usage.lastUsed = Date.now();

    if (success) {
      usage.successCount++;
    } else {
      usage.failureCount++;
    }

    this.saveMemory();
  }

  getToolUsageStats(toolName?: string): any {
    if (toolName) {
      return this.memory.longTerm.toolUsage[toolName] || null;
    }

    return this.memory.longTerm.toolUsage;
  }

  addSuccessRecord(record: any): void {
    this.memory.longTerm.successHistory.push({
      ...record,
      timestamp: Date.now()
    });

    // 限制大小
    if (this.memory.longTerm.successHistory.length > this.maxLongTermSize) {
      this.memory.longTerm.successHistory.shift();
    }

    this.saveMemory();
  }

  getSuccessHistory(limit: number = 50): any[] {
    return this.memory.longTerm.successHistory.slice(-limit);
  }

  // 记忆分析和优化
  getMemoryStats(): any {
    return {
      shortTerm: {
        contextSize: this.memory.shortTerm.currentContext ? 1 : 0,
        actionsCount: this.memory.shortTerm.recentActions.length,
        conversationCount: this.memory.shortTerm.conversationHistory.length
      },
      longTerm: {
        preferencesCount: Object.keys(this.memory.longTerm.userPreferences).length,
        patternsCount: this.memory.longTerm.learnedPatterns.length,
        toolsCount: Object.keys(this.memory.longTerm.toolUsage).length,
        successHistoryCount: this.memory.longTerm.successHistory.length
      }
    };
  }

  optimizeMemory(): void {
    // 清理过期数据
    this.cleanupExpiredData();

    // 压缩重复数据
    this.compressDuplicates();

    // 更新使用频率
    this.updateUsageFrequency();

    this.saveMemory();
  }

  private cleanupExpiredData(): void {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天

    // 清理旧的成功记录
    this.memory.longTerm.successHistory = this.memory.longTerm.successHistory.filter(
      record => (now - record.timestamp) < maxAge
    );

    // 清理旧的学习模式
    this.memory.longTerm.learnedPatterns = this.memory.longTerm.learnedPatterns.filter(
      pattern => (now - pattern.learnedAt) < maxAge && pattern.usageCount > 0
    );
  }

  private compressDuplicates(): void {
    // 压缩重复的对话记录
    const compressed: any[] = [];
    const seen = new Set();

    this.memory.shortTerm.conversationHistory.forEach(message => {
      const key = `${message.type}:${message.content}`;
      if (!seen.has(key)) {
        seen.add(key);
        compressed.push(message);
      }
    });

    this.memory.shortTerm.conversationHistory = compressed;
  }

  private updateUsageFrequency(): void {
    // 更新模式使用频率
    this.memory.longTerm.learnedPatterns.forEach(pattern => {
      // 根据成功记录更新使用频率
      const relatedSuccesses = this.memory.longTerm.successHistory.filter(record =>
        record.goal?.description?.includes(pattern.trigger)
      );
      pattern.usageCount = relatedSuccesses.length;
    });
  }

  // 记忆搜索
  searchMemory(query: string, type: 'all' | 'actions' | 'conversations' | 'patterns' = 'all'): any[] {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    if (type === 'all' || type === 'actions') {
      this.memory.shortTerm.recentActions.forEach(action => {
        if (this.matchesQuery(action, lowerQuery)) {
          results.push({ type: 'action', data: action });
        }
      });
    }

    if (type === 'all' || type === 'conversations') {
      this.memory.shortTerm.conversationHistory.forEach(message => {
        if (this.matchesQuery(message, lowerQuery)) {
          results.push({ type: 'conversation', data: message });
        }
      });
    }

    if (type === 'all' || type === 'patterns') {
      this.memory.longTerm.learnedPatterns.forEach(pattern => {
        if (this.matchesQuery(pattern, lowerQuery)) {
          results.push({ type: 'pattern', data: pattern });
        }
      });
    }

    // 按时间排序
    results.sort((a, b) => (b.data.timestamp || 0) - (a.data.timestamp || 0));

    return results;
  }

  private matchesQuery(item: any, query: string): boolean {
    const searchableFields = ['description', 'content', 'text', 'type', 'tool'];

    return searchableFields.some(field => {
      const value = item[field];
      return value && typeof value === 'string' && value.toLowerCase().includes(query);
    });
  }

  // 记忆导入导出
  exportMemory(): string {
    return JSON.stringify(this.memory, null, 2);
  }

  importMemory(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData);

      // 验证数据结构
      if (this.validateMemoryStructure(imported)) {
        this.memory = imported;
        this.saveMemory();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error importing memory:', error);
      return false;
    }
  }

  private validateMemoryStructure(data: any): boolean {
    // 基本结构验证
    return (
      data &&
      data.shortTerm &&
      data.longTerm &&
      Array.isArray(data.shortTerm.recentActions) &&
      Array.isArray(data.shortTerm.conversationHistory) &&
      typeof data.longTerm.userPreferences === 'object' &&
      Array.isArray(data.longTerm.learnedPatterns)
    );
  }

  // 持久化
  private async loadMemory(): Promise<void> {
    try {
      const data = await browser.storage.local.get('evaAgentMemory');
      if (data.evaAgentMemory) {
        this.memory = { ...this.getDefaultMemory(), ...data.evaAgentMemory };
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      await browser.storage.local.set({ evaAgentMemory: this.memory });
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }

  // 记忆重置
  async resetMemory(): Promise<void> {
    this.memory = this.getDefaultMemory();
    await this.saveMemory();
  }

  getMemory(): AgentMemory {
    return this.memory;
  }

  // 记忆分析和洞察
  generateInsights(): any {
    const insights = [];

    // 分析用户偏好
    const preferences = this.memory.longTerm.userPreferences;
    if (Object.keys(preferences).length > 0) {
      insights.push({
        type: 'preferences',
        message: `用户偏好: ${Object.keys(preferences).join(', ')}`,
        data: preferences
      });
    }

    // 分析工具使用
    const toolUsage = this.memory.longTerm.toolUsage;
    const mostUsedTool = Object.entries(toolUsage)
      .sort((a, b) => b[1].totalUsage - a[1].totalUsage)[0];

    if (mostUsedTool) {
      insights.push({
        type: 'tool_usage',
        message: `最常用工具: ${mostUsedTool[0]} (使用${mostUsedTool[1].totalUsage}次)`,
        data: mostUsedTool
      });
    }

    // 分析成功模式
    const recentSuccesses = this.getSuccessHistory(10);
    if (recentSuccesses.length > 0) {
      const successRate = recentSuccesses.filter(s => s.result?.success).length / recentSuccesses.length;
      insights.push({
        type: 'success_rate',
        message: `最近成功率: ${Math.round(successRate * 100)}%`,
        data: { successRate, recentCount: recentSuccesses.length }
      });
    }

    return insights;
  }
}