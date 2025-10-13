import { AgentGoal, AgentPlan, AgentAction, AgentPerception, AgentContext, AgentMemory, AgentTool } from '../core/agent-types';

export class PlanningService {

  async createPlan(planningContext: {
    goal: AgentGoal;
    perceptions: AgentPerception[];
    context: AgentContext;
    memory: AgentMemory;
    availableTools: AgentTool[];
  }): Promise<AgentPlan> {
    const { goal, perceptions, context, memory, availableTools } = planningContext;

    // 1. 分析目标和环境
    const analysis = this.analyzePlanningContext(goal, perceptions, context, memory);

    // 2. 选择合适的策略
    const strategy = this.selectStrategy(analysis, availableTools);

    // 3. 生成主要计划
    const mainSteps = this.generateMainSteps(goal, analysis, strategy, availableTools);

    // 4. 生成备选方案
    const alternatives = this.generateAlternatives(mainSteps, availableTools, analysis);

    // 5. 估算时间和成功率
    const estimates = this.calculateEstimates(mainSteps, analysis);

    const plan: AgentPlan = {
      id: `plan_${Date.now()}`,
      goal,
      steps: mainSteps,
      alternatives,
      estimatedDuration: estimates.duration,
      successProbability: estimates.probability
    };

    return plan;
  }

  private analyzePlanningContext(
    goal: AgentGoal,
    perceptions: AgentPerception[],
    context: AgentContext,
    memory: AgentMemory
  ): any {
    // 分析目标复杂度
    const complexity = this.assessGoalComplexity(goal);

    // 分析环境因素
    const environment = this.analyzeEnvironment(context, perceptions);

    // 分析历史成功模式
    const patterns = this.findRelevantPatterns(goal, memory);

    // 分析约束条件
    const constraints = this.analyzeConstraints(goal, context);

    return {
      complexity,
      environment,
      patterns,
      constraints,
      riskFactors: this.assessRiskFactors(goal, context)
    };
  }

  private selectStrategy(analysis: any, availableTools: AgentTool[]): string {
    const { complexity, environment, patterns } = analysis;

    // 基于分析选择策略
    if (complexity.level === 'simple') {
      return 'direct_execution';
    } else if (complexity.level === 'moderate') {
      return 'stepwise_execution';
    } else if (complexity.level === 'complex') {
      return 'adaptive_execution';
    }

    // 基于环境选择策略
    if (environment.pageType === 'form') {
      return 'form_filling';
    } else if (environment.pageType === 'ecommerce') {
      return 'purchase_flow';
    } else if (environment.pageType === 'navigation') {
      return 'exploration';
    }

    return 'general';
  }

  private generateMainSteps(
    goal: AgentGoal,
    analysis: any,
    strategy: string,
    availableTools: AgentTool[]
  ): AgentAction[] {
    const steps: AgentAction[] = [];

    switch (strategy) {
      case 'direct_execution':
        steps.push(...this.generateDirectSteps(goal, availableTools));
        break;

      case 'stepwise_execution':
        steps.push(...this.generateStepwiseSteps(goal, analysis, availableTools));
        break;

      case 'adaptive_execution':
        steps.push(...this.generateAdaptiveSteps(goal, analysis, availableTools));
        break;

      case 'form_filling':
        steps.push(...this.generateFormSteps(goal, availableTools));
        break;

      case 'purchase_flow':
        steps.push(...this.generatePurchaseSteps(goal, availableTools));
        break;

      case 'exploration':
        steps.push(...this.generateExplorationSteps(goal, availableTools));
        break;

      default:
        steps.push(...this.generateGeneralSteps(goal, availableTools));
    }

    return steps;
  }

  private generateDirectSteps(goal: AgentGoal, availableTools: AgentTool[]): AgentAction[] {
    const steps: AgentAction[] = [];

    // 分析目标以确定直接操作
    if (goal.description.includes('点击') || goal.description.includes('click')) {
      steps.push({
        id: 'direct_click',
        type: 'click',
        tool: 'click_element',
        parameters: { selector: this.extractSelector(goal.description) },
        confidence: 0.8
      });
    }

    if (goal.description.includes('输入') || goal.description.includes('type')) {
      steps.push({
        id: 'direct_type',
        type: 'type',
        tool: 'type_text',
        parameters: {
          selector: this.extractSelector(goal.description),
          text: this.extractText(goal.description)
        },
        confidence: 0.8
      });
    }

    if (goal.description.includes('导航') || goal.description.includes('navigate')) {
      steps.push({
        id: 'direct_navigate',
        type: 'navigate',
        tool: 'navigate',
        parameters: { url: this.extractUrl(goal.description) },
        confidence: 0.9
      });
    }

    return steps;
  }

  private generateStepwiseSteps(
    goal: AgentGoal,
    analysis: any,
    availableTools: AgentTool[]
  ): AgentAction[] {
    const steps: AgentAction[] = [];

    // 第一步：分析当前状态
    steps.push({
      id: 'analyze_current_state',
      type: 'analysis',
      tool: 'analyze_page',
      parameters: { depth: 1 },
      confidence: 0.9
    });

    // 第二步：根据分析结果执行操作
    if (goal.description.includes('搜索')) {
      steps.push({
        id: 'find_search_element',
        type: 'locate',
        tool: 'click_element',
        parameters: { selector: 'input[type="search"], [placeholder*="搜索"], [placeholder*="search"]' },
        confidence: 0.7
      });

      steps.push({
        id: 'enter_search_query',
        type: 'input',
        tool: 'type_text',
        parameters: {
          selector: 'input[type="search"], [placeholder*="搜索"], [placeholder*="search"]',
          text: this.extractSearchQuery(goal.description)
        },
        confidence: 0.7
      });

      steps.push({
        id: 'submit_search',
        type: 'submit',
        tool: 'click_element',
        parameters: { selector: 'button[type="submit"], .search-button' },
        confidence: 0.6
      });
    }

    return steps;
  }

  private generateAdaptiveSteps(
    goal: AgentGoal,
    analysis: any,
    availableTools: AgentTool[]
  ): AgentAction[] {
    const steps: AgentAction[] = [];

    // 自适应执行需要持续的反馈和调整
    steps.push({
      id: 'initial_analysis',
      type: 'analysis',
      tool: 'analyze_page',
      parameters: { depth: 2 },
      confidence: 0.9
    });

    steps.push({
      id: 'hypothesis_generation',
      type: 'planning',
      tool: 'conversation',
      parameters: {
        message: `基于当前页面分析，我认为要完成"${goal.description}"，我需要先...`,
        context: analysis
      },
      confidence: 0.7
    });

    // 添加验证步骤
    steps.push({
      id: 'verify_hypothesis',
      type: 'validation',
      tool: 'analyze_page',
      parameters: { depth: 1 },
      confidence: 0.6
    });

    return steps;
  }

  private generateFormSteps(goal: AgentGoal, availableTools: AgentTool[]): AgentAction[] {
    const steps: AgentAction[] = [];

    // 表单填充的标准流程
    steps.push({
      id: 'analyze_form',
      type: 'analysis',
      tool: 'analyze_page',
      parameters: { depth: 1 },
      confidence: 0.9
    });

    steps.push({
      id: 'fill_form_fields',
      type: 'input',
      tool: 'type_text',
      parameters: this.extractFormParameters(goal.description),
      confidence: 0.7
    });

    steps.push({
      id: 'submit_form',
      type: 'submit',
      tool: 'click_element',
      parameters: { selector: 'button[type="submit"], input[type="submit"], .submit-btn' },
      confidence: 0.8
    });

    return steps;
  }

  private generatePurchaseSteps(goal: AgentGoal, availableTools: AgentTool[]): AgentAction[] {
    const steps: AgentAction[] = [];

    // 购买流程的标准步骤
    steps.push({
      id: 'find_product',
      type: 'search',
      tool: 'analyze_page',
      parameters: { depth: 1 },
      confidence: 0.8
    });

    steps.push({
      id: 'add_to_cart',
      type: 'click',
      tool: 'click_element',
      parameters: { selector: '.add-to-cart, .buy-now, button:contains("加入购物车")' },
      confidence: 0.7
    });

    steps.push({
      id: 'go_to_checkout',
      type: 'navigate',
      tool: 'click_element',
      parameters: { selector: '.checkout, .cart-button, button:contains("结算")' },
      confidence: 0.7
    });

    return steps;
  }

  private generateExplorationSteps(goal: AgentGoal, availableTools: AgentTool[]): AgentAction[] {
    const steps: AgentAction[] = [];

    // 探索性步骤
    steps.push({
      id: 'page_overview',
      type: 'analysis',
      tool: 'analyze_page',
      parameters: { depth: 1 },
      confidence: 0.9
    });

    steps.push({
      id: 'identify_navigation',
      type: 'locate',
      tool: 'click_element',
      parameters: { selector: 'nav, .navigation, .menu' },
      confidence: 0.6
    });

    return steps;
  }

  private generateGeneralSteps(goal: AgentGoal, availableTools: AgentTool[]): AgentAction[] {
    const steps: AgentAction[] = [];

    // 通用步骤：先分析，再对话
    steps.push({
      id: 'understand_context',
      type: 'analysis',
      tool: 'analyze_page',
      parameters: { depth: 1 },
      confidence: 0.8
    });

    steps.push({
      id: 'clarify_goal',
      type: 'conversation',
      tool: 'conversation',
      parameters: {
        message: `我理解您想要"${goal.description}"。让我先分析一下当前页面，然后为您提供最佳方案。`,
        context: { goal }
      },
      confidence: 0.9
    });

    return steps;
  }

  private generateAlternatives(
    mainSteps: AgentAction[],
    availableTools: AgentTool[],
    analysis: any
  ): AgentAction[][] {
    const alternatives: AgentAction[][] = [];

    // 为每个主要步骤生成备选方案
    mainSteps.forEach(step => {
      const alternativeSteps: AgentAction[] = [];

      // 基于工具类型生成备选方案
      switch (step.tool) {
        case 'click_element':
          // 备选方案1：使用不同的选择器
          alternativeSteps.push({
            ...step,
            id: `${step.id}_alt1`,
            parameters: {
              ...step.parameters,
              selector: this.generateAlternativeSelector(step.parameters.selector)
            },
            confidence: step.confidence * 0.8
          });

          // 备选方案2：使用键盘导航
          alternativeSteps.push({
            id: `${step.id}_alt2`,
            type: 'keyboard',
            tool: 'keyboard_action',
            parameters: { action: 'tab_and_enter' },
            confidence: step.confidence * 0.6
          });
          break;

        case 'type_text':
          // 备选方案：使用剪贴板粘贴
          alternativeSteps.push({
            ...step,
            id: `${step.id}_alt1`,
            parameters: {
              ...step.parameters,
              method: 'paste'
            },
            confidence: step.confidence * 0.9
          });
          break;

        case 'navigate':
          // 备选方案：使用搜索找到页面
          alternativeSteps.push({
            id: `${step.id}_alt1`,
            type: 'search_navigate',
            tool: 'search_and_navigate',
            parameters: { query: this.extractUrlFromNavigate(step.parameters.url) },
            confidence: step.confidence * 0.7
          });
          break;
      }

      if (alternativeSteps.length > 0) {
        alternatives.push(alternativeSteps);
      }
    });

    return alternatives;
  }

  private calculateEstimates(steps: AgentAction[], analysis: any): { duration: number; probability: number } {
    // 基础时间估算
    let baseDuration = 0;
    let totalConfidence = 0;

    steps.forEach(step => {
      switch (step.type) {
        case 'analysis':
          baseDuration += 2; // 2秒
          break;
        case 'click':
          baseDuration += 1; // 1秒
          break;
        case 'type':
          baseDuration += 3; // 3秒
          break;
        case 'navigate':
          baseDuration += 5; // 5秒
          break;
        case 'conversation':
          baseDuration += 1; // 1秒
          break;
        default:
          baseDuration += 2; // 默认2秒
      }

      totalConfidence += step.confidence;
    });

    // 基于环境因素调整时间
    const environmentMultiplier = this.getEnvironmentMultiplier(analysis.environment);
    const adjustedDuration = baseDuration * environmentMultiplier;

    // 计算成功概率
    const averageConfidence = totalConfidence / steps.length;
    const complexityAdjustment = this.getComplexityAdjustment(analysis.complexity);
    const successProbability = Math.max(0.1, Math.min(1.0, averageConfidence * complexityAdjustment));

    return {
      duration: Math.round(adjustedDuration),
      probability: Math.round(successProbability * 100) / 100
    };
  }

  // 辅助方法
  private assessGoalComplexity(goal: AgentGoal): any {
    const description = goal.description.toLowerCase();

    if (description.includes('点击') || description.includes('click')) {
      return { level: 'simple', factors: ['single_action'] };
    } else if (description.includes('然后') || description.includes('and then')) {
      return { level: 'moderate', factors: ['multiple_steps'] };
    } else if (description.includes('搜索') || description.includes('购买')) {
      return { level: 'complex', factors: ['multi_stage_process'] };
    }

    return { level: 'simple', factors: ['unknown'] };
  }

  private analyzeEnvironment(context: AgentContext, perceptions: AgentPerception[]): any {
    return {
      pageType: this.inferPageType(context),
      interactiveElements: context.visualElements.filter(el => el.visible).length,
      hasForms: context.visualElements.some(el => el.tagName === 'FORM'),
      complexity: context.visualElements.length > 50 ? 'high' : 'low'
    };
  }

  private inferPageType(context: AgentContext): string {
    const url = context.currentUrl.toLowerCase();

    if (url.includes('login') || url.includes('signin')) return 'login';
    if (url.includes('search')) return 'search';
    if (url.includes('cart') || url.includes('checkout')) return 'ecommerce';
    if (url.includes('admin') || url.includes('dashboard')) return 'admin';

    return 'general';
  }

  private findRelevantPatterns(goal: AgentGoal, memory: AgentMemory): any[] {
    return memory.longTerm.successHistory.filter(history =>
      history.goal.description.toLowerCase().includes(goal.description.toLowerCase().substring(0, 10))
    );
  }

  private analyzeConstraints(goal: AgentGoal, context: AgentContext): string[] {
    const constraints: string[] = [];

    if (goal.constraints) {
      constraints.push(...goal.constraints);
    }

    // 基于环境添加约束
    if (context.visualElements.length === 0) {
      constraints.push('no_interactive_elements');
    }

    if (context.currentUrl.includes('login')) {
      constraints.push('authentication_required');
    }

    return constraints;
  }

  private assessRiskFactors(goal: AgentGoal, context: AgentContext): string[] {
    const risks: string[] = [];

    if (goal.description.includes('购买') || goal.description.includes('buy')) {
      risks.push('financial_transaction');
    }

    if (goal.description.includes('删除') || goal.description.includes('delete')) {
      risks.push('destructive_action');
    }

    return risks;
  }

  private extractSelector(description: string): string {
    // 简单的选择器提取逻辑
    const patterns = [
      /id[:\s]+([a-zA-Z][\w-]*)/i,
      /class[:\s]+([a-zA-Z][\w-]*)/i,
      /["']([^"']+)["']/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'button, a, input';
  }

  private extractText(description: string): string {
    const patterns = [
      /(?:输入|填写|type|enter)\s*["']([^"']+)["']/i,
      /(?:文本|text)\s*[:\s]*["']([^"']+)["']/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  private extractUrl(description: string): string {
    const urlPattern = /https?:\/\/[^\s]+/i;
    const match = description.match(urlPattern);
    return match ? match[0] : '';
  }

  private extractSearchQuery(description: string): string {
    const patterns = [
      /(?:搜索|查找|search for)\s*["']([^"']+)["']/i,
      /(?:搜索|查找|search)\s*([^，。！？\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return description;
  }

  private extractFormParameters(description: string): any {
    return {
      selector: 'input, textarea, select',
      text: this.extractText(description),
      options: { clearFirst: true }
    };
  }

  private extractUrlFromNavigate(url: string): string {
    try {
      return new URL(url).searchParams.get('q') || '';
    } catch {
      return '';
    }
  }

  private generateAlternativeSelector(originalSelector: string): string {
    // 生成备选选择器
    if (originalSelector.includes('id=')) {
      return originalSelector.replace(/id=/, 'class=');
    } else if (originalSelector.includes('class=')) {
      return originalSelector.replace(/class=/, 'data-testid=');
    } else {
      return `${originalSelector}, [role="button"]`;
    }
  }

  private getEnvironmentMultiplier(environment: any): number {
    switch (environment.complexity) {
      case 'high': return 1.5;
      case 'medium': return 1.2;
      default: return 1.0;
    }
  }

  private getComplexityAdjustment(complexity: any): number {
    switch (complexity.level) {
      case 'simple': return 1.0;
      case 'moderate': return 0.8;
      case 'complex': return 0.6;
      default: return 0.7;
    }
  }
}