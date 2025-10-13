import { browser } from 'wxt/browser';
import { AgentGoal, AgentPerception, AgentPlan, AgentContext, AgentMemory } from '../core/agent-types';

export class AIService {
  private modelConfig: any = null;

  constructor() {
    this.loadModelConfig();
  }

  private async loadModelConfig(): Promise<void> {
    try {
      const data = await browser.storage.local.get("modelConfig");
      this.modelConfig = data.modelConfig;
    } catch (error) {
      console.error('Error loading model config:', error);
    }
  }

  async analyzeGoal(userInput: string, perceptions: AgentPerception[], memory: AgentMemory): Promise<any> {
    const prompt = this.buildGoalAnalysisPrompt(userInput, perceptions, memory);

    try {
      const response = await this.callAI(prompt);
      return this.parseGoalAnalysis(response);
    } catch (error) {
      console.error('Error analyzing goal:', error);
      return this.getDefaultGoalAnalysis(userInput);
    }
  }

  async createPlan(goal: AgentGoal, perceptions: AgentPerception[], context: AgentContext, memory: AgentMemory, availableTools: any[]): Promise<AgentPlan> {
    const prompt = this.buildPlanningPrompt(goal, perceptions, context, memory, availableTools);

    try {
      const response = await this.callAI(prompt);
      return this.parsePlan(response, goal);
    } catch (error) {
      console.error('Error creating plan:', error);
      return this.getDefaultPlan(goal);
    }
  }

  async reflect(session: any): Promise<any> {
    const prompt = this.buildReflectionPrompt(session);

    try {
      const response = await this.callAI(prompt);
      return this.parseReflection(response);
    } catch (error) {
      console.error('Error during reflection:', error);
      return { learnings: [], insights: [] };
    }
  }

  async analyzePage(context: AgentContext, depth: number = 1): Promise<any> {
    const prompt = this.buildPageAnalysisPrompt(context, depth);

    try {
      const response = await this.callAI(prompt);
      return this.parsePageAnalysis(response);
    } catch (error) {
      console.error('Error analyzing page:', error);
      return { elements: [], structure: '', summary: '' };
    }
  }

  async converse(message: string, context: any): Promise<string> {
    const prompt = this.buildConversationPrompt(message, context);

    try {
      const response = await this.callAI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error in conversation:', error);
      return '抱歉，我现在无法回应。请稍后再试。';
    }
  }

  private buildGoalAnalysisPrompt(userInput: string, perceptions: AgentPerception[], memory: AgentMemory): string {
    return `你是一个智能助手，需要分析用户的意图并确定目标。

用户输入: "${userInput}"

感知信息:
${perceptions.map(p => `- ${p.type}: ${JSON.stringify(p.data, null, 2)}`).join('\n')}

用户历史偏好:
${JSON.stringify(memory.longTerm.userPreferences, null, 2)}

请分析用户的意图并提供以下信息:
1. 目标描述
2. 优先级 (1-10)
3. 约束条件
4. 成功标准

以JSON格式回复:
{
  "description": "明确的目标描述",
  "priority": 数字,
  "constraints": ["约束1", "约束2"],
  "successCriteria": ["成功标准1", "成功标准2"]
}`;
  }

  private buildPlanningPrompt(goal: AgentGoal, perceptions: AgentPerception[], context: AgentContext, memory: AgentMemory, availableTools: any[]): string {
    return `你是一个智能规划助手，需要为给定目标制定执行计划。

目标: ${goal.description}
优先级: ${goal.priority}
约束条件: ${goal.constraints?.join(', ') || '无'}
成功标准: ${goal.successCriteria?.join(', ') || '无'}

当前环境:
- URL: ${context.currentUrl}
- 页面标题: ${context.pageTitle}
- 可见元素数量: ${context.visualElements.length}

可用工具:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

请制定一个详细的执行计划，包括:
1. 主要步骤序列
2. 备选方案
3. 预估时间
4. 成功概率

以JSON格式回复:
{
  "steps": [
    {
      "id": "step_1",
      "type": "action_type",
      "tool": "tool_name",
      "parameters": {"param": "value"},
      "description": "步骤描述"
    }
  ],
  "alternatives": [
    [
      {
        "id": "alt_step_1",
        "type": "action_type",
        "tool": "alternative_tool",
        "parameters": {"param": "value"},
        "description": "备选步骤描述"
      }
    ]
  ],
  "estimatedDuration": 估算时间(秒),
  "successProbability": 成功概率(0-1)
}`;
  }

  private buildReflectionPrompt(session: any): string {
    return `你是一个反思型AI助手，需要分析任务执行过程并提取学习经验。

执行结果:
${JSON.stringify(session.result, null, 2)}

请分析并回答:
1. 执行成功的原因是什么？
2. 失败的根本原因是什么？
3. 哪些步骤可以优化？
4. 用户有什么新的偏好？
5. 从中可以学到什么模式？

以JSON格式回复:
{
  "insights": ["洞察1", "洞察2"],
  "learnings": [
    {
      "pattern": "模式描述",
      "condition": "触发条件",
      "action": "建议行动"
    }
  ],
  "userPreferences": {
    "preference_type": "preference_value"
  }
}`;
  }

  private buildPageAnalysisPrompt(context: AgentContext, depth: number): string {
    return `请分析当前页面的结构和内容。

URL: ${context.currentUrl}
标题: ${context.pageTitle}
页面内容摘要: ${context.pageContent.substring(0, 1000)}...

可见元素:
${context.visualElements.slice(0, 20).map(el =>
  `- ${el.tagName}: ${el.text?.substring(0, 50) || ''} (${el.visible ? 'visible' : 'hidden'})`
).join('\n')}

请提供:
1. 页面主要结构分析
2. 可交互元素识别
3. 页面类型判断
4. 用户可能的操作意图

以JSON格式回复:
{
  "pageType": "页面类型",
  "structure": "页面结构描述",
  "interactiveElements": [
    {
      "selector": "CSS选择器",
      "text": "元素文本",
      "type": "元素类型",
      "action": "可能的操作"
    }
  ],
  "summary": "页面总结"
}`;
  }

  private buildConversationPrompt(message: string, context: any): string {
    return `你是一个智能助手EVA，正在进行对话。

当前上下文:
- 当前页面: ${context.context?.currentUrl || '未知'}
- 最近对话: ${context.history?.slice(-3).map((h: any) => `${h.type}: ${h.content}`).join('\n') || '无'}

用户消息: "${message}"

请提供有帮助、友好且准确的回应。如果用户要求执行操作，请提供指导而不是直接执行（除非在浏览器环境中）。`;
  }

  private async callAI(prompt: string): Promise<string> {
    if (!this.modelConfig) {
      throw new Error('AI model not configured');
    }

    const response = await fetch(this.modelConfig.url || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.modelConfig.key}`
      },
      body: JSON.stringify({
        model: this.modelConfig.model,
        messages: [
          {
            role: 'system',
            content: '你是EVA，一个智能浏览器助手。请始终以JSON格式回复，除非明确要求其他格式。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private parseGoalAnalysis(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing goal analysis:', error);
    }
    return null;
  }

  private parsePlan(response: string, goal: AgentGoal): AgentPlan {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[0]);
        return {
          id: `plan_${Date.now()}`,
          goal,
          steps: planData.steps || [],
          alternatives: planData.alternatives || [],
          estimatedDuration: planData.estimatedDuration || 30,
          successProbability: planData.successProbability || 0.7
        };
      }
    } catch (error) {
      console.error('Error parsing plan:', error);
    }
    return this.getDefaultPlan(goal);
  }

  private parseReflection(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing reflection:', error);
    }
    return { learnings: [], insights: [] };
  }

  private parsePageAnalysis(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing page analysis:', error);
    }
    return { elements: [], structure: '', summary: '' };
  }

  private getDefaultGoalAnalysis(userInput: string): any {
    return {
      description: `执行用户请求: ${userInput}`,
      priority: 5,
      constraints: [],
      successCriteria: ['任务完成', '用户满意']
    };
  }

  private getDefaultPlan(goal: AgentGoal): AgentPlan {
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps: [
        {
          id: 'conversation_step',
          type: 'conversation',
          tool: 'conversation',
          parameters: { message: `我理解您想要: ${goal.description}` },
          description: '回应用户请求'
        }
      ],
      alternatives: [],
      estimatedDuration: 5,
      successProbability: 0.8
    };
  }
}