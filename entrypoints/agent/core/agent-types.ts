export enum AgentCapability {
  VISUAL_PERCEPTION = "visual_perception",
  TEXT_UNDERSTANDING = "text_understanding",
  ACTION_PLANNING = "action_planning",
  TOOL_EXECUTION = "tool_execution",
  CONTEXT_AWARENESS = "context_awareness",
  ADAPTIVE_LEARNING = "adaptive_learning",
  CONVERSATION = "conversation",
  TASK_COORDINATION = "task_coordination"
}

export enum AgentState {
  IDLE = "idle",
  PERCEIVING = "perceiving",
  PLANNING = "planning",
  EXECUTING = "executing",
  REFLECTING = "reflecting",
  ERROR = "error"
}

export interface AgentGoal {
  id: string;
  description: string;
  priority: number;
  constraints?: string[];
  successCriteria?: string[];
}

export interface AgentPerception {
  id: string;
  type: "visual" | "text" | "context" | "user_intent";
  data: any;
  confidence: number;
  timestamp: number;
}

export interface AgentAction {
  id: string;
  type: string;
  tool: string;
  parameters: Record<string, any>;
  expectedOutcome?: string;
  confidence: number;
}

export interface AgentPlan {
  id: string;
  goal: AgentGoal;
  steps: AgentAction[];
  alternatives: AgentAction[][];
  estimatedDuration: number;
  successProbability: number;
}

export interface AgentMemory {
  shortTerm: {
    currentContext: any;
    recentActions: AgentAction[];
    conversationHistory: any[];
  };
  longTerm: {
    userPreferences: Record<string, any>;
    learnedPatterns: any[];
    toolUsage: Record<string, number>;
    successHistory: any[];
  };
}

export interface AgentTool {
  name: string;
  description: string;
  capabilities: AgentCapability[];
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
  validate?: (params: any) => boolean;
}

export interface AgentContext {
  currentUrl: string;
  pageTitle: string;
  pageContent: string;
  visualElements: any[];
  userIntent?: string;
  sessionHistory: any[];
  environmentalFactors: {
    deviceType: string;
    browserInfo: string;
    screenResolution: string;
    currentTime: number;
  };
}