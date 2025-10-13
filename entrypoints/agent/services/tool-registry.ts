import { AgentTool, AgentCapability } from '../core/agent-types';

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private capabilities: Map<AgentCapability, AgentTool[]> = new Map();

  register(tool: AgentTool): void {
    // 验证工具
    this.validateTool(tool);

    // 注册工具
    this.tools.set(tool.name, tool);

    // 按能力分类
    tool.capabilities.forEach(capability => {
      if (!this.capabilities.has(capability)) {
        this.capabilities.set(capability, []);
      }
      this.capabilities.get(capability)!.push(tool);
    });

    console.log(`Tool registered: ${tool.name}`);
  }

  unregister(toolName: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // 从能力映射中移除
    tool.capabilities.forEach(capability => {
      const tools = this.capabilities.get(capability);
      if (tools) {
        const index = tools.indexOf(tool);
        if (index > -1) {
          tools.splice(index, 1);
        }
      }
    });

    // 从主注册表中移除
    this.tools.delete(toolName);

    console.log(`Tool unregistered: ${toolName}`);
  }

  get(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName);
  }

  getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCapability(capability: AgentCapability): AgentTool[] {
    return this.capabilities.get(capability) || [];
  }

  findTools(keyword: string): AgentTool[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.tools.values()).filter(tool =>
      tool.name.toLowerCase().includes(lowerKeyword) ||
      tool.description.toLowerCase().includes(lowerKeyword)
    );
  }

  listTools(): Array<{ name: string; description: string; capabilities: AgentCapability[] }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      capabilities: tool.capabilities
    }));
  }

  private validateTool(tool: AgentTool): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error('Tool must have a valid description');
    }

    if (!tool.capabilities || !Array.isArray(tool.capabilities)) {
      throw new Error('Tool must have valid capabilities array');
    }

    if (!tool.parameters || typeof tool.parameters !== 'object') {
      throw new Error('Tool must have valid parameters object');
    }

    if (!tool.execute || typeof tool.execute !== 'function') {
      throw new Error('Tool must have an execute function');
    }

    // 检查名称是否已存在
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' already exists`);
    }

    // 验证能力是否有效
    tool.capabilities.forEach(capability => {
      if (!Object.values(AgentCapability).includes(capability)) {
        throw new Error(`Invalid capability: ${capability}`);
      }
    });
  }

  // 工具使用统计
  private usageStats: Map<string, number> = new Map();

  recordUsage(toolName: string): void {
    const current = this.usageStats.get(toolName) || 0;
    this.usageStats.set(toolName, current + 1);
  }

  getUsageStats(): Map<string, number> {
    return new Map(this.usageStats);
  }

  getMostUsedTools(count: number = 5): Array<{ tool: AgentTool; usage: number }> {
    const sorted = Array.from(this.usageStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);

    return sorted.map(([name, usage]) => ({
      tool: this.tools.get(name)!,
      usage
    }));
  }

  // 工具推荐
  recommendTools(goal: string, capabilities: AgentCapability[]): AgentTool[] {
    // 简单的推荐算法
    let candidates: AgentTool[] = [];

    // 1. 按能力匹配
    capabilities.forEach(capability => {
      const tools = this.getToolsByCapability(capability);
      candidates.push(...tools);
    });

    // 2. 去重
    candidates = Array.from(new Set(candidates));

    // 3. 按使用频率排序
    candidates.sort((a, b) => {
      const usageA = this.usageStats.get(a.name) || 0;
      const usageB = this.usageStats.get(b.name) || 0;
      return usageB - usageA;
    });

    // 4. 按关键词匹配增强
    const keywords = goal.toLowerCase().split(/\s+/);
    candidates.forEach(tool => {
      let score = 0;
      keywords.forEach(keyword => {
        if (tool.name.toLowerCase().includes(keyword)) score += 2;
        if (tool.description.toLowerCase().includes(keyword)) score += 1;
      });
      (tool as any).relevanceScore = score;
    });

    candidates.sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore);

    return candidates.slice(0, 10); // 返回前10个推荐工具
  }
}