import { generateText, tool, generateObject, streamText } from 'ai';
import { z } from 'zod';
import { AIConfig, AIProviders, getProviderById, getModelById, ModelCapability } from '@/lib/ai-providers';

/**
 * Enhanced AI Service using Vercel AI SDK
 * 支持多种AI模型提供商的统一AI服务
 */
export class AIService {
  private config: AIConfig | null = null;
  private initialized = false;

  constructor() {}

  /**
   * 初始化AI服务
   */
  async initialize(config: AIConfig): Promise<void> {
    try {
      this.config = config;

      // 验证配置
      if (!config.apiKey) {
        throw new Error('API key is required');
      }

      if (!config.provider || !config.model) {
        throw new Error('Provider and model are required');
      }

      // 测试连接
      await this.testConnection();

      this.initialized = true;
      console.log(`AI Service initialized with ${config.provider} / ${config.model}`);
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * 测试AI连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('AI Service not initialized');
    }

    try {
      const result = await this.generateText({
        prompt: 'Hello! Please respond with just "Connection test successful" to confirm the configuration works.',
        maxTokens: 10
      });

      return result.text.includes('Connection test successful');
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 获取AI实例
   */
  private getAI() {
    if (!this.config || !this.initialized) {
      throw new Error('AI Service not initialized');
    }

    const provider = getProviderById(this.config.provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${this.config.provider}`);
    }

    return provider.create(this.config.apiKey, {
      baseURL: this.config.baseUrl || provider.customBaseUrl,
    });
  }

  /**
   * 获取模型实例
   */
  private getModel() {
    const ai = this.getAI();
    const model = getModelById(this.config!.provider, this.config!.model);
    if (!model) {
      throw new Error(`Unknown model: ${this.config!.model}`);
    }

    return ai(model.id);
  }

  /**
   * 生成文本
   */
  async generateText(params: {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
    tools?: any[];
  }): Promise<{ text: string; usage?: any }> {
    const model = this.getModel();

    const result = await generateText({
      model,
      prompt: params.prompt,
      maxTokens: params.maxTokens || this.config?.maxTokens || 4096,
      temperature: params.temperature ?? this.config?.temperature ?? 0.7,
      system: params.system,
      tools: params.tools
    });

    return {
      text: result.text,
      usage: result.usage
    };
  }

  /**
   * 生成流式文本
   */
  async generateStreamText(params: {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
    onUpdate?: (text: string) => void;
    onFinish?: (text: string) => void;
  }): Promise<void> {
    const model = this.getModel();

    const { textStream } = await streamText({
      model,
      prompt: params.prompt,
      maxTokens: params.maxTokens || this.config?.maxTokens || 4096,
      temperature: params.temperature ?? this.config?.temperature ?? 0.7,
      system: params.system
    });

    let fullText = '';
    for await (const delta of textStream) {
      fullText += delta;
      params.onUpdate?.(fullText);
    }

    params.onFinish?.(fullText);
  }

  /**
   * 生成结构化对象
   */
  async generateObject<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  }): Promise<{ object: T; usage?: any }> {
    const model = this.getModel();

    const result = await generateObject({
      model,
      prompt: params.prompt,
      schema: params.schema,
      maxTokens: params.maxTokens || this.config?.maxTokens || 4096,
      temperature: params.temperature ?? this.config?.temperature ?? 0.7,
      system: params.system
    });

    return {
      object: result.object,
      usage: result.usage
    };
  }

  /**
   * 任务规划 - 将用户请求分解为可执行的步骤
   */
  async planTask(
    userMessage: string,
    perception: any,
    availableTools: any[],
    memory: any
  ): Promise<{
    goal: string;
    steps: Array<{
      description: string;
      action: string;
      parameters: Record<string, any>;
      reasoning: string;
    }>;
    confidence: number;
  }> {
    const toolDescriptions = availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters?.shape || {}
    }));

    const prompt = `
作为AI智能助手，你需要将用户的请求分解为可执行的步骤。

用户请求: ${userMessage}

当前页面上下文:
- URL: ${perception.context?.currentUrl || 'N/A'}
- 标题: ${perception.context?.pageTitle || 'N/A'}
- 页面内容摘要: ${perception.context?.pageContent?.substring(0, 1000) || 'N/A'}

可用工具:
${toolDescriptions.map(t => `- ${t.name}: ${t.description}`).join('\n')}

历史记忆:
${memory?.workingMemory?.recentActions?.slice(-3).map((a: any) => `- ${a.description}`).join('\n') || '无'}

请创建一个详细的执行计划，包括:
1. 明确的目标
2. 具体的执行步骤
3. 每个步骤使用的工具和参数
4. 执行逻辑说明
5. 成功信心评估 (0-1)

返回JSON格式的计划。
`;

    const schema = z.object({
      goal: z.string().describe('任务目标'),
      steps: z.array(z.object({
        description: z.string().describe('步骤描述'),
        action: z.string().describe('要使用的工具名称'),
        parameters: z.record(z.any()).describe('工具参数'),
        reasoning: z.string().describe('执行逻辑说明')
      })).describe('执行步骤'),
      confidence: z.number().min(0).max(1).describe('成功信心')
    });

    const result = await this.generateObject({
      prompt,
      schema,
      system: '你是一个专业的任务规划助手，擅长将复杂的用户请求分解为具体的执行步骤。'
    });

    return result.object;
  }

  /**
   * 执行反思 - 分析任务执行结果并学习
   */
  async reflectOnTask(task: any, results: any): Promise<{
    summary: string;
    success: boolean;
    learnings: string[];
    improvements: string[];
    confidence: number;
  }> {
    const prompt = `
分析以下任务的执行结果:

任务目标: ${task.description}
执行步骤: ${task.steps.map((s: any) => `- ${s.description} (${s.action})`).join('\n')}

执行结果:
${results.map((r: any) => `
步骤 ${r.stepId}: ${r.action}
${r.success ? '✅ 成功' : '❌ 失败'}
${r.result ? `结果: ${JSON.stringify(r.result)}` : ''}
${r.error ? `错误: ${r.error}` : ''}
`).join('\n')}

请提供详细的分析和反思:
1. 执行总结
2. 是否成功完成目标
3. 从中学习到的经验教训
4. 可以改进的地方
5. 对未来类似任务的信心评估 (0-1)

返回JSON格式的反思结果。
`;

    const schema = z.object({
      summary: z.string().describe('执行总结'),
      success: z.boolean().describe('是否成功完成目标'),
      learnings: z.array(z.string()).describe('学习到的经验教训'),
      improvements: z.array(z.string()).describe('可以改进的地方'),
      confidence: z.number().min(0).max(1).describe('对未来类似任务的信心评估')
    });

    const result = await this.generateObject({
      prompt,
      schema,
      system: '你是一个专业的任务分析师，擅长分析执行结果并提供有价值的反思和改进建议。'
    });

    return result.object;
  }

  /**
   * 生成用户友好回复
   */
  async generateResponse(task: any, results: any): Promise<string> {
    const successCount = results.filter((r: any) => r.success).length;
    const totalCount = results.length;

    const prompt = `
基于以下任务执行结果，生成一个友好、自然的回复给用户:

用户原始请求: ${task.description}

执行结果:
- 总步骤数: ${totalCount}
- 成功步骤数: ${successCount}
- 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%

详细结果:
${results.map((r: any) => `
步骤: ${r.action}
${r.success ? '✅ 成功' : '❌ 失败'}
${r.result ? `结果: ${JSON.stringify(r.result).substring(0, 200)}...` : ''}
${r.error ? `错误: ${r.error}` : ''}
`).join('\n')}

请生成一个自然、友好的回复，包含:
1. 确认用户请求
2. 简要说明执行了什么操作
3. 报告结果状态
4. 如有失败，说明原因
5. 提供下一步建议

回复应该简洁明了，避免技术细节。
`;

    const result = await this.generateText({
      prompt,
      maxTokens: 500,
      system: '你是一个友好的AI助手，擅长向用户解释执行结果和提供帮助。'
    });

    return result.text;
  }

  /**
   * 感知分析 - 分析用户意图和页面上下文
   */
  async analyzeUserIntent(userMessage: string, context: any): Promise<{
    intent: string;
    entities: Record<string, any>;
    urgency: 'low' | 'medium' | 'high' | 'urgent';
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: number; // 预估执行时间（秒）
  }> {
    const prompt = `
分析用户的意图和请求:

用户消息: ${userMessage}

页面上下文:
- URL: ${context.currentUrl || 'N/A'}
- 标题: ${context.pageTitle || 'N/A'}
- 页面内容: ${context.pageContent?.substring(0, 1000) || 'N/A'}

请分析:
1. 用户的主要意图是什么？
2. 消息中提到的实体（按钮、链接、文本等）
3. 请求的紧急程度
4. 任务复杂度
5. 预估执行时间（秒）

返回JSON格式的分析结果。
`;

    const schema = z.object({
      intent: z.string().describe('用户的主要意图'),
      entities: z.record(z.any()).describe('提取的实体信息'),
      urgency: z.enum(['low', 'medium', 'high', 'urgent']).describe('紧急程度'),
      complexity: z.enum(['simple', 'moderate', 'complex']).describe('任务复杂度'),
      estimatedTime: z.number().describe('预估执行时间（秒）')
    });

    const result = await this.generateObject({
      prompt,
      schema,
      system: '你是一个专业的意图分析师，擅长理解用户需求和评估任务复杂度。'
    });

    return result.object;
  }

  /**
   * 检查模型能力
   */
  checkModelCapabilities(): ModelCapability[] {
    if (!this.config) {
      return [];
    }

    const model = getModelById(this.config.provider, this.config.model);
    return model?.capabilities || [];
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIConfig | null {
    return this.config;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 更新配置
   */
  async updateConfig(config: AIConfig): Promise<void> {
    await this.initialize(config);
  }
}