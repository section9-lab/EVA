import React, { useState, useEffect } from 'react'
import { useTranslation } from "react-i18next"
import { browser } from "wxt/browser"
import { AI_PROVIDERS, getProviderById, getProviderModels, AIConfig } from "@/lib/ai-providers"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Loader2, TestTube, AlertCircle, Key } from "lucide-react"

export function AIProviderSettings() {
  const { t } = useTranslation()
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  useEffect(() => {
    browser.storage.local.get('aiConfig').then((data) => {
      if (data.aiConfig) setConfig(data.aiConfig)
    })
  }, [])

  const save = async (next: AIConfig) => {
    setConfig(next)
    await browser.storage.local.set({ aiConfig: next })
  }

  const testConnection = async () => {
    if (!config.apiKey.trim()) { setTestStatus('error'); return }
    setIsTesting(true)
    setTestStatus('testing')
    try {
      const provider = getProviderById(config.provider)
      const model = getProviderModels(config.provider).find(m => m.id === config.model)
      if (!provider || !model) { setTestStatus('error'); return }
      const aiClient = provider.create(config.apiKey)
      const { generateText } = await import('ai')
      const result = await generateText({
        model: aiClient(model.id),
        prompt: 'Reply "OK"',
        maxTokens: 5,
        temperature: 0,
      } as any)
      setTestStatus(result.text?.trim() ? 'success' : 'error')
    } catch {
      setTestStatus('error')
    } finally {
      setIsTesting(false)
    }
  }

  const selectedProvider = getProviderById(config.provider)
  const availableModels = selectedProvider ? getProviderModels(selectedProvider.id) : []
  const selectedModel = availableModels.find(m => m.id === config.model)

  return (
    <div className="space-y-3">
      {/* Provider */}
      <div className="relative">
        <select
          value={config.provider}
          onChange={(e) => save({ ...config, provider: e.target.value, model: getProviderById(e.target.value)?.defaultModel || '' })}
          className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.displayName}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Model */}
      <div className="relative">
        <select
          value={config.model}
          onChange={(e) => save({ ...config, model: e.target.value })}
          className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>{m.displayName}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* API Key */}
      <div className="relative">
        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => save({ ...config, apiKey: e.target.value })}
          placeholder={t('enterApiKey', { provider: selectedProvider?.displayName || 'AI' })}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      {/* Test */}
      <div className="flex items-center gap-2">
        <button
          onClick={testConnection}
          disabled={isTesting || !config.apiKey.trim()}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            isTesting || !config.apiKey.trim()
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : testStatus === 'success' ? "bg-emerald-600 text-white"
              : testStatus === 'error' ? "bg-red-600 text-white"
              : "bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          {isTesting ? <Loader2 className="h-3 w-3 animate-spin" />
            : testStatus === 'success' ? <Check className="h-3 w-3" />
            : testStatus === 'error' ? <AlertCircle className="h-3 w-3" />
            : <TestTube className="h-3 w-3" />}
          <span>{testStatus === 'idle' ? t('testConnection') : testStatus === 'testing' ? t('testing') : testStatus === 'success' ? t('connected') : t('failed')}</span>
        </button>
      </div>

      {/* Model info */}
      {selectedModel && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-0.5">
          <p><span className="font-medium text-foreground">Context:</span> {selectedModel.contextWindow.toLocaleString()} tokens</p>
          {selectedModel.inputCost && <p><span className="font-medium text-foreground">Input:</span> ${selectedModel.inputCost}/1M</p>}
          {selectedModel.outputCost && <p><span className="font-medium text-foreground">Output:</span> ${selectedModel.outputCost}/1M</p>}
        </div>
      )}
    </div>
  )
}
