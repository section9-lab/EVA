import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { browser } from "wxt/browser";
import { AI_PROVIDERS, getProviderById, getProviderModels, AIConfig } from "@/lib/ai-providers";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  TestTube,
  AlertCircle,
  Key,
  Globe
} from "lucide-react";

export function AIProviderSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await browser.storage.local.get('aiConfig');
      if (data.aiConfig) {
        setConfig(data.aiConfig);
      } else {
        // 如果没有配置，创建默认配置并保存
        const defaultConfig = {
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: '',
          temperature: 0.7,
          maxTokens: 4096
        };
        await saveConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const saveConfig = async (newConfig: AIConfig) => {
    try {
      await browser.storage.local.set({ aiConfig: newConfig });
      setConfig(newConfig);
    } catch (error) {
      console.error('Error saving AI config:', error);
    }
  };

  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      setTestStatus('error');
      return;
    }

    setIsTesting(true);
    setTestStatus('testing');

    try {
      const provider = getProviderById(config.provider);
      const model = getProviderModels(config.provider).find(m => m.id === config.model);

      if (!provider || !model) {
        setTestStatus('error');
        return;
      }

      // 创建 AI 客户端实例
      const aiClient = provider.create(config.apiKey);

      // 导入 generateText 函数
      const { generateText } = await import('ai');

      // 发送真实测试请求
      const result = await generateText({
        model: aiClient(model.id),
        prompt: 'Hello! Please respond with just "Connection test successful" to confirm the configuration works.',
        maxTokens: 10,
        temperature: 0.1,
      });

      // 检查响应是否成功
      if (result.text && result.text.trim().length > 0) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);

      // 根据错误类型提供更具体的反馈
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('authentication')) {
          // API key 无效
          console.error('Invalid API key');
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          // 模型不存在
          console.error('Model not found');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          // 网络问题
          console.error('Network error');
        }
      }

      setTestStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const selectedProvider = getProviderById(config.provider);
  const availableModels = selectedProvider ? getProviderModels(selectedProvider.id) : [];
  const selectedModel = availableModels.find(m => m.id === config.model);

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('aiProvider')}
        </label>
        <div className="relative">
          <select
            value={config.provider}
            onChange={(e) => saveConfig({ ...config, provider: e.target.value, model: getProviderById(e.target.value)?.defaultModel || '' })}
            className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {selectedProvider && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {selectedProvider.description}
          </p>
        )}
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('modelName')}
        </label>
        <div className="relative">
          <select
            value={config.model}
            onChange={(e) => saveConfig({ ...config, model: e.target.value })}
            className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {selectedModel && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedModel.capabilities.map((capability) => (
              <span
                key={capability}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {capability.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          <div className="flex items-center space-x-1">
            <Key className="h-3 w-3" />
            <span>{t('apiKey')}</span>
          </div>
        </label>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => saveConfig({ ...config, apiKey: e.target.value })}
          placeholder={t('enterApiKey', { provider: selectedProvider?.displayName || 'AI' })}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
        />
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <span>{t('advancedSettings')}</span>
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature: {config.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => saveConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Tokens: {config.maxTokens}
              </label>
              <input
                type="number"
                min="1"
                max="32000"
                value={config.maxTokens}
                onChange={(e) => saveConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Test Connection */}
      <div className="flex items-center space-x-3">
        <button
          onClick={testConnection}
          disabled={isTesting || !config.apiKey.trim()}
          className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            isTesting || !config.apiKey.trim()
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
              : testStatus === 'success'
              ? "bg-green-600 text-white hover:bg-green-700"
              : testStatus === 'error'
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          )}
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('testing')}</span>
            </>
          ) : testStatus === 'success' ? (
            <>
              <Check className="h-4 w-4" />
              <span>{t('connected')}</span>
            </>
          ) : testStatus === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>{t('failed')}</span>
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4" />
              <span>{t('testConnection')}</span>
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {testStatus === 'success' && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-xs text-green-800 dark:text-green-200">
            {t('connectionSuccessful', {
              provider: selectedProvider?.displayName || 'Provider',
              model: selectedModel?.displayName || 'Model'
            })}
          </p>
        </div>
      )}

      {testStatus === 'error' && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-800 dark:text-red-200">
            {t('connectionFailed')}
          </p>
        </div>
      )}

      {/* Model Info */}
      {selectedModel && (
        <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="space-y-1">
            <p><span className="font-medium">Context Window:</span> {selectedModel.contextWindow.toLocaleString()} tokens</p>
            {selectedModel.inputCost && (
              <p><span className="font-medium">Input Cost:</span> ${selectedModel.inputCost}/1M tokens</p>
            )}
            {selectedModel.outputCost && (
              <p><span className="font-medium">Output Cost:</span> ${selectedModel.outputCost}/1M tokens</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}