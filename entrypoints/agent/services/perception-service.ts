import { AgentPerception, AgentContext } from '../core/agent-types';
import { AIService } from './ai-service';

export class PerceptionService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  async perceiveText(userInput: string, context: AgentContext): Promise<AgentPerception | null> {
    try {
      const analysis = await this.analyzeTextIntent(userInput, context);

      return {
        id: `perception_text_${Date.now()}`,
        type: 'text',
        data: {
          input: userInput,
          intent: analysis.intent,
          entities: analysis.entities,
          sentiment: analysis.sentiment,
          urgency: analysis.urgency
        },
        confidence: analysis.confidence,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error in text perception:', error);
      return null;
    }
  }

  async perceiveVisual(context: AgentContext): Promise<AgentPerception | null> {
    try {
      const visualAnalysis = await this.analyzeVisualContext(context);

      return {
        id: `perception_visual_${Date.now()}`,
        type: 'visual',
        data: {
          pageLayout: visualAnalysis.layout,
          keyElements: visualAnalysis.elements,
          colorScheme: visualAnalysis.colors,
          contentType: visualAnalysis.type
        },
        confidence: visualAnalysis.confidence,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error in visual perception:', error);
      return null;
    }
  }

  async perceiveContext(context: AgentContext): Promise<AgentPerception | null> {
    try {
      const contextAnalysis = await this.analyzeContext(context);

      return {
        id: `perception_context_${Date.now()}`,
        type: 'context',
        data: {
          url: context.currentUrl,
          domain: this.extractDomain(context.currentUrl),
          pageType: contextAnalysis.pageType,
          userState: contextAnalysis.userState,
          sessionInfo: contextAnalysis.sessionInfo
        },
        confidence: 0.9,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error in context perception:', error);
      return null;
    }
  }

  async perceiveUserIntent(userInput: string, context: AgentContext): Promise<AgentPerception | null> {
    try {
      const intentAnalysis = await this.analyzeUserIntent(userInput, context);

      return {
        id: `perception_intent_${Date.now()}`,
        type: 'user_intent',
        data: {
          primaryIntent: intentAnalysis.primary,
          secondaryIntents: intentAnalysis.secondary,
          confidence: intentAnalysis.confidence,
          requiredActions: intentAnalysis.actions,
          userGoal: intentAnalysis.goal
        },
        confidence: intentAnalysis.confidence,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error in user intent perception:', error);
      return null;
    }
  }

  private async analyzeTextIntent(userInput: string, context: AgentContext): Promise<any> {
    // 使用简单的关键词匹配和模式识别
    const patterns = {
      navigation: ['打开', '访问', '导航', '去', '转到', 'navigate', 'open', 'go to'],
      interaction: ['点击', '选择', '输入', '填写', 'click', 'select', 'type', 'fill'],
      information: ['什么是', '告诉我', '解释', 'what is', 'tell me', 'explain'],
      search: ['搜索', '查找', '找', 'search', 'find', 'look for'],
      purchase: ['购买', '买', '下单', 'buy', 'purchase', 'order'],
      completion: ['完成', '结束', '关闭', 'complete', 'finish', 'close']
    };

    let detectedIntents = [];
    let entities = [];

    // 检测意图
    for (const [intent, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => userInput.toLowerCase().includes(keyword.toLowerCase()))) {
        detectedIntents.push(intent);
      }
    }

    // 提取实体（URL、邮箱、电话等）
    const urlRegex = /https?:\/\/[^\s]+/g;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b\d{3}-?\d{3}-?\d{4}\b/g;

    const urls = userInput.match(urlRegex) || [];
    const emails = userInput.match(emailRegex) || [];
    const phones = userInput.match(phoneRegex) || [];

    if (urls.length > 0) entities.push({ type: 'url', value: urls[0] });
    if (emails.length > 0) entities.push({ type: 'email', value: emails[0] });
    if (phones.length > 0) entities.push({ type: 'phone', value: phones[0] });

    // 检测紧急程度
    const urgentKeywords = ['紧急', '立即', '马上', 'urgent', 'immediately', 'asap'];
    const urgency = urgentKeywords.some(keyword =>
      userInput.toLowerCase().includes(keyword.toLowerCase())
    ) ? 'high' : 'normal';

    // 情感分析（简单版本）
    const positiveWords = ['好', '棒', '谢谢', 'good', 'great', 'thanks'];
    const negativeWords = ['坏', '错误', '失败', 'bad', 'error', 'failed'];

    let sentiment = 'neutral';
    if (positiveWords.some(word => userInput.toLowerCase().includes(word.toLowerCase()))) {
      sentiment = 'positive';
    } else if (negativeWords.some(word => userInput.toLowerCase().includes(word.toLowerCase()))) {
      sentiment = 'negative';
    }

    return {
      intent: detectedIntents.length > 0 ? detectedIntents[0] : 'general',
      entities,
      sentiment,
      urgency,
      confidence: detectedIntents.length > 0 ? 0.8 : 0.5
    };
  }

  private async analyzeVisualContext(context: AgentContext): Promise<any> {
    const elements = context.visualElements;

    // 分析页面结构
    const hasHeader = elements.some(el => el.tagName === 'HEADER' || el.className?.includes('header'));
    const hasNav = elements.some(el => el.tagName === 'NAV' || el.className?.includes('nav'));
    const hasMain = elements.some(el => el.tagName === 'MAIN' || el.className?.includes('main'));
    const hasFooter = elements.some(el => el.tagName === 'FOOTER' || el.className?.includes('footer'));

    // 分析可交互元素
    const buttons = elements.filter(el => el.tagName === 'BUTTON' || el.className?.includes('btn'));
    const inputs = elements.filter(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    const links = elements.filter(el => el.tagName === 'A');

    // 判断页面类型
    let pageType = 'unknown';
    if (inputs.length > 3) pageType = 'form';
    else if (links.length > 10) pageType = 'navigation';
    else if (buttons.length > 5) pageType = 'interactive';
    else if (context.pageContent.length > 2000) pageType = 'content';

    return {
      layout: {
        hasHeader,
        hasNav,
        hasMain,
        hasFooter
      },
      elements: {
        buttons: buttons.length,
        inputs: inputs.length,
        links: links.length,
        total: elements.length
      },
      colors: ['dominant', 'accent'], // 可以进一步分析颜色
      type: pageType,
      confidence: 0.7
    };
  }

  private async analyzeContext(context: AgentContext): Promise<any> {
    const url = context.currentUrl;
    const domain = this.extractDomain(url);

    // 判断页面类型
    let pageType = 'unknown';
    if (url.includes('search') || url.includes('query')) pageType = 'search';
    else if (url.includes('cart') || url.includes('checkout')) pageType = 'ecommerce';
    else if (url.includes('admin') || url.includes('dashboard')) pageType = 'admin';
    else if (url.includes('profile') || url.includes('account')) pageType = 'profile';
    else if (url.includes('login') || url.includes('signin')) pageType = 'login';

    // 分析用户状态
    const userState = {
      isAuthenticated: !url.includes('login') && !url.includes('guest'),
      hasCart: url.includes('cart') || this.hasCartCookie(context),
      browsingTime: Date.now() - (context.sessionHistory[0]?.timestamp || Date.now())
    };

    return {
      pageType,
      userState,
      sessionInfo: {
        duration: userState.browsingTime,
        interactions: context.sessionHistory.length,
        lastActivity: context.sessionHistory[context.sessionHistory.length - 1]?.timestamp
      }
    };
  }

  private async analyzeUserIntent(userInput: string, context: AgentContext): Promise<any> {
    // 综合分析用户意图
    const textPerception = await this.perceiveText(userInput, context);
    const contextPerception = await this.perceiveContext(context);

    let primaryIntent = 'general';
    let secondaryIntents: string[] = [];
    let requiredActions: string[] = [];

    if (textPerception) {
      primaryIntent = textPerception.data.intent;

      // 根据意图确定所需操作
      switch (primaryIntent) {
        case 'navigation':
          requiredActions = ['navigate', 'wait_for_load'];
          break;
        case 'interaction':
          requiredActions = ['locate_element', 'interact'];
          break;
        case 'search':
          requiredActions = ['find_search_box', 'input_query', 'submit'];
          break;
        case 'information':
          requiredActions = ['analyze_content', 'extract_info'];
          break;
      }
    }

    // 基于上下文添加次要意图
    if (contextPerception) {
      if (contextPerception.data.pageType === 'ecommerce') {
        secondaryIntents.push('browse_products');
      } else if (contextPerception.data.pageType === 'search') {
        secondaryIntents.push('refine_search');
      }
    }

    return {
      primary: primaryIntent,
      secondary: secondaryIntents,
      confidence: textPerception?.confidence || 0.5,
      actions: requiredActions,
      goal: this.extractGoal(userInput, primaryIntent)
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private hasCartCookie(context: AgentContext): boolean {
    // 这里可以实现更复杂的 cookie 检查逻辑
    return false;
  }

  private extractGoal(userInput: string, intent: string): string {
    // 提取用户的具体目标
    const goalPatterns = {
      navigation: /(?:去|到|访问|打开|navigate|go to)\s*(.+)/i,
      search: /(?:搜索|查找|找|search|find)\s*(.+)/i,
      purchase: /(?:购买|买|下单|buy|purchase)\s*(.+)/i,
      information: /(?:什么是|告诉我|解释|what is|tell me about)\s*(.+)/i
    };

    const pattern = goalPatterns[intent as keyof typeof goalPatterns];
    if (pattern) {
      const match = userInput.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return userInput;
  }
}