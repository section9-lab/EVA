import React, { useState } from "react";
import { ThemeSettings } from "@/components/settings/theme-settings.tsx";
import { I18nSettings } from "@/components/settings/i18n-settings.tsx";
import { ModelSettings } from "@/components/settings/model-settings.tsx";
import {
  Settings,
  Palette,
  Globe,
  Brain,
  ArrowLeft,
  ArrowUp,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsTab = 'ai' | 'appearance' | 'advanced';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  const tabs = [
    {
      id: 'ai' as SettingsTab,
      title: 'AI Model',
      description: 'Configure AI model and provider',
      icon: Brain,
    },
    {
      id: 'appearance' as SettingsTab,
      title: 'Appearance',
      description: 'Theme and language settings',
      icon: Palette,
    },
    {
      id: 'advanced' as SettingsTab,
      title: 'Advanced',
      description: 'Advanced configurations',
      icon: Settings,
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Settings Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
              <Settings className="h-4 w-4 text-white dark:text-black" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-3">
          <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-white dark:bg-black text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-1">AI Configuration</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                Configure your preferred AI model and provider
              </p>
            </div>

            <div className="space-y-4">
              <ModelSettings />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-xs font-semibold mb-2">Supported Providers</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">OpenAI</span>
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Anthropic Claude</span>
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Google Gemini</span>
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">DeepSeek</span>
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">智谱 GLM</span>
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-1">Appearance</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                Customize the look and feel
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold mb-3">Theme</h4>
                <ThemeSettings />
              </div>

              <div>
                <h4 className="text-xs font-semibold mb-3 flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  Language
                </h4>
                <I18nSettings />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-1">Advanced Settings</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                Advanced configurations and options
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold mb-2">Browser Automation</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  EVA includes built-in Playwright automation capabilities
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-800 dark:text-green-200">
                      No additional setup required
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold mb-2">About EVA</h4>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <p>Version: 0.0.1</p>
                  <p>Built with Vercel AI SDK</p>
                  <p>Modern browser extension framework</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}