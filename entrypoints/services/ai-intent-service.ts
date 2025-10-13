import { Task, TaskStep, ElementSelector, PageAnalysis } from '@/entrypoints/types';
import { browser } from 'wxt/browser';

export class AIIntentService {
  private static instance: AIIntentService;

  static getInstance(): AIIntentService {
    if (!AIIntentService.instance) {
      AIIntentService.instance = new AIIntentService();
    }
    return AIIntentService.instance;
  }

  async analyzeIntent(userMessage: string, pageContext?: PageAnalysis, usePlaywright = false): Promise<Task | null> {
    try {
      // 1. 从存储中获取模型配置
      const data = await browser.storage.local.get("modelConfig");
      if (!data.modelConfig) {
        console.error("Model configuration not found");
        return null;
      }

      const config = data.modelConfig as { url?: string; key: string; model: string };
      if (!config.key || !config.model) {
        console.error("API key or model name is missing");
        return null;
      }

      // 2. 检查用户消息是否需要 Playwright
      const needsPlaywright = usePlaywright || this.detectPlaywrightNeed(userMessage);

      // 3. 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(pageContext, needsPlaywright);

      // 4. 调用AI进行意图分析和任务分解
      const response = await this.callAI(userMessage, systemPrompt, config);

      // 5. 解析AI响应并构建任务
      const task = this.parseTaskFromResponse(response, userMessage, needsPlaywright);

      return task;
    } catch (error) {
      console.error("Error analyzing intent:", error);
      return null;
    }
  }

  private detectPlaywrightNeed(userMessage: string): boolean {
    const playwrightKeywords = [
      '截图', 'screenshot',
      '导航', 'navigate', '打开新页面', 'open new page',
      '悬停', 'hover',
      '拖拽', 'drag', '拖动',
      '选择', 'select option',
      '上传', 'upload',
      '下载', 'download',
      '等待页面', 'wait for page',
      '执行脚本', 'execute script',
      '新标签页', 'new tab'
    ];

    const lowerMessage = userMessage.toLowerCase();
    return playwrightKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  private buildSystemPrompt(pageContext?: PageAnalysis, usePlaywright = false): string {
    let prompt = `你是EVA助手，一个能够理解用户意图并将其分解为具体操作步骤的AI助手。

你的任务是分析用户的请求，识别他们想要执行的操作，并将这些操作分解为具体的、可执行的步骤。

${usePlaywright ? `
你现在可以使用 Playwright 进行更强大的浏览器自动化操作。

可用的操作类型：
1. navigate - 导航到指定URL
2. click - 点击页面上的元素
3. fill - 填充输入框
4. type - 在输入框中输入文本
5. scroll - 滚动页面或到特定元素
6. wait - 等待元素出现或等待指定时间
7. extract - 提取元素的文本内容
8. screenshot - 截取页面或元素截图
9. hover - 鼠标悬停在元素上
10. select - 选择下拉框选项
11. drag - 拖拽操作

元素定位方式：
1. css - CSS选择器
2. text - 根据文本内容查找元素
3. xpath - XPath表达式
4. aria-label - 根据aria-label属性查找元素
5. role - 根据角色查找元素（如 button, link, input）

Playwright 特殊功能：
- 支持复杂的CSS选择器和XPath
- 可以等待页面加载和导航完成
- 支持屏幕截图
- 可以执行JavaScript代码
- 支持文件上传和下载
` : `
可用的操作类型：
1. click - 点击页面上的元素
2. type - 在输入框中输入文本
3. scroll - 滚动到特定元素
4. wait - 等待元素出现
5. extract - 提取元素的文本内容

元素定位方式：
1. css - CSS选择器
2. text - 根据文本内容查找元素
3. aria-label - 根据aria-label属性查找元素
`}

请以JSON格式响应，包含以下结构：
{
  "description": "任务的简要描述",
  "usePlaywright": ${usePlaywright},
  "steps": [
    {
      "action": "操作类型",
      "target": {
        "type": "定位方式",
        "value": "定位值"
      },
      "value": "输入的文本（如果需要）"${usePlaywright ? `,
      "playwrightAction": "对应的 Playwright 操作",
      "playwrightParams": {
        "参数名": "参数值"
      }` : ''}
    }
  ]
}`;

    if (pageContext && pageContext.interactiveElements.length > 0) {
      prompt += `\n\n当前页面的可交互元素：\n`;
      pageContext.interactiveElements.forEach(element => {
        prompt += `- ${element.text} (${element.type}): ${element.selector}\n`;
      });
      prompt += "\n请优先使用这些已知的元素选择器。";
    }

    return prompt;
  }

  private async callAI(userMessage: string, systemPrompt: string, config: any): Promise<string> {
    const response = await fetch(config.url || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private parseTaskFromResponse(response: string, userMessage: string, usePlaywright = false): Task | null {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      const task: Task = {
        id: `task-${Date.now()}`,
        description: parsedResponse.description || userMessage,
        status: 'pending',
        createdAt: Date.now(),
        steps: []
      };

      if (parsedResponse.steps && Array.isArray(parsedResponse.steps)) {
        task.steps = parsedResponse.steps.map((step: any, index: number) => ({
          id: `step-${Date.now()}-${index}`,
          action: step.action || 'click',
          target: step.target,
          value: step.value,
          status: 'pending',
          playwrightAction: step.playwrightAction,
          playwrightParams: step.playwrightParams
        }));
      }

      // 如果任务需要 Playwright，添加一个特殊标记
      if (usePlaywright || parsedResponse.usePlaywright) {
        (task as any).usePlaywright = true;
      }

      return task;
    } catch (error) {
      console.error("Error parsing task response:", error);
      return null;
    }
  }

  // 智能元素匹配
  async findBestElementMatch(description: string, pageContext: PageAnalysis): Promise<ElementSelector | null> {
    if (!pageContext.interactiveElements.length) {
      return null;
    }

    try {
      // 使用简单的文本匹配算法
      const elements = pageContext.interactiveElements;
      const keywords = description.toLowerCase().split(/\s+/);

      let bestMatch = null;
      let bestScore = 0;

      elements.forEach(element => {
        let score = 0;
        const elementText = element.text.toLowerCase();

        // 计算匹配分数
        keywords.forEach(keyword => {
          if (elementText.includes(keyword)) {
            score += 1;
          }
        });

        // 如果元素类型匹配描述中的关键词，增加分数
        if (description.toLowerCase().includes('button') && element.type === 'button') {
          score += 2;
        }
        if (description.toLowerCase().includes('link') && element.type === 'a') {
          score += 2;
        }
        if (description.toLowerCase().includes('input') && (element.type === 'input' || element.type === 'textarea')) {
          score += 2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = element;
        }
      });

      if (bestMatch && bestScore > 0) {
        return {
          type: 'css',
          value: bestMatch.selector
        };
      }

      return null;
    } catch (error) {
      console.error("Error finding best element match:", error);
      return null;
    }
  }

  // 验证任务的可行性
  async validateTask(task: Task): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!task.description || task.description.trim() === '') {
      errors.push("任务描述不能为空");
    }

    if (!task.steps || task.steps.length === 0) {
      errors.push("任务必须包含至少一个步骤");
    }

    for (const step of task.steps) {
      if (!step.action) {
        errors.push("每个步骤必须有操作类型");
        continue;
      }

      if (step.action !== 'wait' && step.action !== 'extract' && !step.target) {
        errors.push(`操作 "${step.action}" 需要指定目标元素`);
      }

      if (step.action === 'type' && !step.value) {
        errors.push("输入操作需要指定要输入的文本");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}