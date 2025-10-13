import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createXai } from '@ai-sdk/xai';
import { createPerplexity } from '@ai-sdk/perplexity';
import { z } from 'zod';

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
  description: 'OpenAI\'s powerful language models including GPT series',
  website: 'https://openai.com',
  icon: '🤖',
  create: createOpenAI,
  models: [
    {
      id: 'gpt-4o',
      name: 'gpt-4o',
      displayName: 'GPT-4o',
      description: 'GPT-4o omni model: vision, text, and more',
      contextWindow: 128000,
      maxTokens: 16384,
      inputCost: 2.5,
      outputCost: 10,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION, ModelCapability.MULTIMODAL]
    },
    {
      id: 'gpt-4o-mini',
      name: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      description: 'Affordable and intelligent small model for fast tasks',
      contextWindow: 128000,
      maxTokens: 16384,
      inputCost: 0.15,
      outputCost: 0.6,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'gpt-4-turbo',
      name: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      description: 'GPT-4 Turbo with improved instruction following',
      contextWindow: 128000,
      maxTokens: 4096,
      inputCost: 0.5,
      outputCost: 2,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT]
    },
    {
      id: 'o1-preview',
      name: 'o1-preview',
      displayName: 'OpenAI o1-preview',
      description: 'OpenAI o1 reasoning model',
      contextWindow: 128000,
      maxTokens: 32768,
      inputCost: 15,
      outputCost: 60,
      capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING]
    },
    {
      id: 'o1-mini',
      name: 'o1-mini',
      displayName: 'OpenAI o1-mini',
      description: 'OpenAI o1 reasoning model (mini)',
      contextWindow: 128000,
      maxTokens: 65536,
      inputCost: 3,
      outputCost: 12,
      capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING]
    }
  ],
  defaultModel: 'gpt-4o',
  apiKeyRequired: true
};

// Anthropic Provider
export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  displayName: 'Anthropic Claude',
  description: 'Anthropic\'s Claude AI assistant family',
  website: 'https://anthropic.com',
  icon: '🧠',
  create: createAnthropic,
  models: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'claude-3-5-sonnet-20241022',
      displayName: 'Claude 3.5 Sonnet',
      description: 'Most powerful model for complex tasks',
      contextWindow: 200000,
      maxTokens: 8192,
      inputCost: 3,
      outputCost: 15,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL]
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'claude-3-5-haiku-20241022',
      displayName: 'Claude 3.5 Haiku',
      description: 'Fastest and most compact model for near-instant responses',
      contextWindow: 200000,
      maxTokens: 8192,
      inputCost: 0.25,
      outputCost: 1.25,
      capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT]
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
  description: 'Google\'s multimodal AI models',
  website: 'https://ai.google.dev',
  icon: '🔮',
  create: (apiKey, options) => createGoogleGenerativeAI({ apiKey, ...options }),
  models: [
    {
      id: 'gemini-2.0-flash-exp',
      name: 'gemini-2.0-flash-exp',
      displayName: 'Gemini 2.0 Flash',
      description: 'Multimodal model with 1M context window',
      contextWindow: 1048576,
      maxTokens: 8192,
      inputCost: 0.075,
      outputCost: 0.3,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'gemini-1.5-pro',
      name: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      description: 'High-performance multimodal model',
      contextWindow: 2097152,
      maxTokens: 8192,
      inputCost: 1.25,
      outputCost: 5,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.MULTIMODAL, ModelCapability.CODE_GENERATION]
    }
  ],
  defaultModel: 'gemini-2.0-flash-exp',
  apiKeyRequired: true
};

// Mistral Provider
export const mistralProvider: AIProvider = {
  id: 'mistral',
  name: 'Mistral',
  displayName: 'Mistral AI',
  description: 'Mistral\'s high-performance language models',
  website: 'https://mistral.ai',
  icon: '🌊',
  create: createMistral,
  models: [
    {
      id: 'mistral-large-2407',
      name: 'mistral-large-2407',
      displayName: 'Mistral Large',
      description: 'Flagship model with top-tier reasoning capabilities',
      contextWindow: 128000,
      maxTokens: 131072,
      inputCost: 2,
      outputCost: 6,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'codestral-2407',
      name: 'codestral-2407',
      displayName: 'Mistral Codestral',
      description: 'Designed for code generation, conversation, and instruction following',
      contextWindow: 32000,
      maxTokens: 32768,
      inputCost: 1,
      outputCost: 3,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    }
  ],
  defaultModel: 'mistral-large-2407',
  apiKeyRequired: true
};

// Cohere Provider
export const cohereProvider: AIProvider = {
  id: 'cohere',
  name: 'Cohere',
  displayName: 'Cohere',
  description: 'Cohere\'s large language models',
  website: 'https://cohere.com',
  icon: '🎯',
  create: createCohere,
  models: [
    {
      id: 'command-r-plus-08-2024',
      name: 'command-r-plus-08-2024',
      displayName: 'Command R+',
      description: 'Command R+ is our most powerful, largest model',
      contextWindow: 128000,
      maxTokens: 4096,
      inputCost: 3,
      outputCost: 15,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'command-r-08-2024',
      name: 'command-r-08-2024',
      displayName: 'Command R',
      description: 'Command R is our most advanced model',
      contextWindow: 128000,
      maxTokens: 4096,
      inputCost: 0.5,
      outputCost: 1.5,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    }
  ],
  defaultModel: 'command-r-plus-08-2024',
  apiKeyRequired: true
};

// Groq Provider (Llama models)
export const groqProvider: AIProvider = {
  id: 'groq',
  name: 'Groq',
  displayName: 'Groq',
  description: 'Groq\'s fast API for Llama models',
  website: 'https://groq.com',
  icon: '🦙',
  create: createOpenAI,
  customBaseUrl: 'https://api.groq.com/openai/v1',
  models: [
    {
      id: 'llama-3.1-70b-versatile',
      name: 'llama-3.1-70b-versatile',
      displayName: 'Llama 3.1 70B',
      description: 'Meta Llama 3.1 70B - the most capable model',
      contextWindow: 131072,
      maxTokens: 4096,
      inputCost: 0.59,
      outputCost: 0.79,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'llama-3.1-8b-instant',
      displayName: 'Llama 3.1 8B Instant',
      description: 'Meta Llama 3.1 8B - fast and efficient model',
      contextWindow: 131072,
      maxTokens: 4096,
      inputCost: 0.055,
      outputCost: 0.38,
      capabilities: [ModelCapability.TEXT, ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_OUTPUT, ModelCapability.CODE_GENERATION]
    }
  ],
  defaultModel: 'llama-3.1-8b-instant',
  apiKeyRequired: true
};

// All providers
export const AI_PROVIDERS: AIProvider[] = [
  openaiProvider,
  anthropicProvider,
  googleProvider,
  mistralProvider,
  cohereProvider,
  groqProvider
];

// Configuration schema
export const AIConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

export function getProviderById(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find(provider => provider.id === id);
}

export function getProviderModels(providerId: string): AIModel[] {
  const provider = getProviderById(providerId);
  return provider?.models || [];
}

export function getModelById(providerId: string, modelId: string): AIModel | undefined {
  const models = getProviderModels(providerId);
  return models?.find(model => model.id === modelId);
}

export function getAllModels(): Array<{ provider: AIProvider; model: AIModel }> {
  const allModels: Array<{ provider: AIProvider; model: AIModel }> = [];

  for (const provider of AI_PROVIDERS) {
    for (const model of provider.models) {
      allModels.push({ provider, model });
    }
  }

  return allModels;
}

export function filterModelsByCapability(
  capability: ModelCapability
): Array<{ provider: AIProvider; model: AIModel }> {
  const allModels = getAllModels();
  return allModels.filter(({ model }) =>
    model.capabilities.includes(capability)
  );
}

export function searchModels(query: string): Array<{ provider: AIProvider; model: AIModel }> {
  const allModels = getAllModels();
  const lowerQuery = query.toLowerCase();

  return allModels.filter(({ provider, model }) =>
    model.name.toLowerCase().includes(lowerQuery) ||
    model.displayName.toLowerCase().includes(lowerQuery) ||
    model.description.toLowerCase().includes(lowerQuery) ||
    provider.name.toLowerCase().includes(lowerQuery) ||
    provider.displayName.toLowerCase().includes(lowerQuery)
  );
}