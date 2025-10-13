import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

// Custom providers for DeepSeek and GLM
const createDeepSeek = (apiKey: string) => {
  const client = createOpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  });
  return client;
};

const createGLM = (apiKey: string) => {
  const client = createOpenAI({
    apiKey,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  });
  return client;
};

export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  description: string;
  website: string;
  icon: string;
  create: (apiKey: string, options?: any) => any;
  models: AIModel[];
  defaultModel: string;
  apiKeyRequired: boolean;
  baseUrlRequired?: boolean;
  customBaseUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  contextWindow: number;
  maxTokens?: number;
  inputCost?: number; // cost per 1M tokens
  outputCost?: number; // cost per 1M tokens
  capabilities: ModelCapability[];
}

export enum ModelCapability {
  TEXT = 'text',
  VISION = 'vision',
  FUNCTION_CALLING = 'function_calling',
  STREAMING = 'streaming',
  JSON_OUTPUT = 'json_output',
  CODE_GENERATION = 'code_generation',
  MULTIMODAL = 'multimodal'
}

// OpenAI Provider
export const openaiProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  displayName: 'OpenAI',
  description: 'Leading AI research company with powerful language models',
  website: 'https://openai.com',
  icon: '🤖',
  create: createOpenAI,
  models: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      displayName: 'GPT-4o',
      description: 'Multimodal flagship model with vision capabilities',
      contextWindow: 128000,
      maxTokens: 4096,
      inputCost: 5.0,
      outputCost: 15.0,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      displayName: 'GPT-4o Mini',
      description: 'Affordable multimodal model',
      contextWindow: 128000,
      maxTokens: 16384,
      inputCost: 0.15,
      outputCost: 0.6,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      displayName: 'GPT-4 Turbo',
      description: 'High-performance model with large context window',
      contextWindow: 128000,
      maxTokens: 4096,
      inputCost: 10.0,
      outputCost: 30.0,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT]
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      displayName: 'GPT-3.5 Turbo',
      description: 'Fast and efficient model for most tasks',
      contextWindow: 16385,
      maxTokens: 4096,
      inputCost: 0.5,
      outputCost: 1.5,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT]
    }
  ],
  defaultModel: 'gpt-4o-mini',
  apiKeyRequired: true
};

// Anthropic Provider
export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  displayName: 'Anthropic Claude',
  description: 'AI safety company with advanced conversational models',
  website: 'https://anthropic.com',
  icon: '🧠',
  create: createAnthropic,
  models: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      displayName: 'Claude 3.5 Sonnet',
      description: 'Most powerful Claude model with advanced reasoning',
      contextWindow: 200000,
      maxTokens: 8192,
      inputCost: 3.0,
      outputCost: 15.0,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      displayName: 'Claude 3.5 Haiku',
      description: 'Fast and efficient Claude model',
      contextWindow: 200000,
      maxTokens: 8192,
      inputCost: 0.25,
      outputCost: 1.25,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      displayName: 'Claude 3 Opus',
      description: 'Most capable Claude model for complex tasks',
      contextWindow: 200000,
      maxTokens: 4096,
      inputCost: 15.0,
      outputCost: 75.0,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    }
  ],
  defaultModel: 'claude-3-5-sonnet-20241022',
  apiKeyRequired: true
};

// Google Provider
export const googleProvider: AIProvider = {
  id: 'google',
  name: 'Google',
  displayName: 'Google Gemini',
  description: 'Multimodal AI models from Google',
  website: 'https://ai.google.dev',
  icon: '🔍',
  create: createGoogleGenerativeAI,
  models: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      displayName: 'Gemini 1.5 Pro',
      description: 'Google\'s most capable multimodal model',
      contextWindow: 2000000,
      maxTokens: 8192,
      inputCost: 3.5,
      outputCost: 10.5,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      displayName: 'Gemini 1.5 Flash',
      description: 'Fast and efficient multimodal model',
      contextWindow: 1000000,
      maxTokens: 8192,
      inputCost: 0.075,
      outputCost: 0.3,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'gemini-1.0-pro',
      name: 'Gemini 1.0 Pro',
      displayName: 'Gemini 1.0 Pro',
      description: 'Google\'s original Gemini model',
      contextWindow: 32768,
      maxTokens: 2048,
      inputCost: 0.5,
      outputCost: 1.5,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT]
    }
  ],
  defaultModel: 'gemini-1.5-flash',
  apiKeyRequired: true
};

// DeepSeek Provider
export const deepseekProvider: AIProvider = {
  id: 'deepseek',
  name: 'DeepSeek',
  displayName: 'DeepSeek',
  description: 'Advanced AI models for reasoning and coding',
  website: 'https://deepseek.com',
  icon: '🔥',
  create: createDeepSeek,
  models: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      displayName: 'DeepSeek Chat',
      description: 'Advanced conversational AI model',
      contextWindow: 128000,
      maxTokens: 8192,
      inputCost: 0.14,
      outputCost: 0.28,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      displayName: 'DeepSeek Coder',
      description: 'Specialized model for code generation',
      contextWindow: 128000,
      maxTokens: 8192,
      inputCost: 0.14,
      outputCost: 0.28,
      capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    }
  ],
  defaultModel: 'deepseek-chat',
  apiKeyRequired: true
};

// GLM Provider (智谱AI)
export const glmProvider: AIProvider = {
  id: 'glm',
  name: 'GLM',
  displayName: 'GLM',
  description: 'Chinese AI company with powerful language models',
  website: 'https://open.bigmodel.cn/api/',
  icon: '🧠',
  create: createGLM,
  models: [
    {
      id: 'glm-4-flash',
      name: 'GLM-4 Flash',
      displayName: 'GLM-4 Flash',
      description: 'Fast and efficient multimodal model',
      contextWindow: 128000,
      maxTokens: 8192,
      inputCost: 0.001,
      outputCost: 0.002,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'GLM-4.5',
      name: 'GLM-4.5',
      displayName: 'GLM-4.5',
      description: 'Advanced multimodal model with enhanced capabilities',
      contextWindow: 128000,
      maxTokens: 8192,
      inputCost: 0.025,
      outputCost: 0.05,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'GLM-4.5-Air',
      name: 'GLM-4.5-Air',
      displayName: 'GLM-4.5-Air',
      description: 'Flagship model with strong reasoning capabilities',
      contextWindow: 128000,
      maxTokens: 8192,
      inputCost: 0.025,
      outputCost: 0.05,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    }
  ],
  defaultModel: 'glm-4-flash',
  apiKeyRequired: true
};

// Export all providers
export const AI_PROVIDERS: AIProvider[] = [
  openaiProvider,
  anthropicProvider,
  googleProvider,
  deepseekProvider,
  glmProvider
];

// Helper functions
export function getProviderById(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find(provider => provider.id === id);
}

export function getProviderModels(providerId: string): AIModel[] {
  const provider = getProviderById(providerId);
  return provider ? provider.models : [];
}

export function getModelById(providerId: string, modelId: string): AIModel | undefined {
  const models = getProviderModels(providerId);
  return models.find(model => model.id === modelId);
}

export function getAllModels(): { provider: AIProvider; model: AIModel }[] {
  const allModels: { provider: AIProvider; model: AIModel }[] = [];

  AI_PROVIDERS.forEach(provider => {
    provider.models.forEach(model => {
      allModels.push({ provider, model });
    });
  });

  return allModels;
}

// Configuration schema
export const AIConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(32000).default(4096),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;