import React, { useEffect, useState } from "react";
import "../../assets/main.css";
import { browser } from "wxt/browser";
import ExtMessage, { MessageType } from "@/entrypoints/types.ts";
import { Home } from "@/entrypoints/sidepanel/home.tsx";
import { SettingsPage } from "@/entrypoints/sidepanel/settings.tsx";
import { useTheme } from "@/components/theme-provider.tsx";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Bot,
  Settings,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
  Menu,
  Moon,
  Sun
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [newBotMessage, setNewBotMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function initI18n() {
    let data = await browser.storage.local.get('i18n');
    if (data.i18n) {
      await i18n.changeLanguage(data.i18n);
    }
  }

  useEffect(() => {
    const handleMessage = async (message: ExtMessage) => {
      if (message.messageType === MessageType.changeLocale) {
        i18n.changeLanguage(message.content);
      } else if (message.messageType === MessageType.changeTheme) {
        toggleTheme(message.content);
      } else if (message.messageType === MessageType.saveModelConfig) {
        console.log("Model config updated:", message.content);
      } else if (message.messageType === MessageType.historyResult) {
        setNewBotMessage(message.content);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    initI18n();
    setIsInitialized(true);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-gray-600 dark:border-t-white"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading EVA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100",
      theme
    )}>
      {/* Main Content */}
      <div className="flex flex-1 flex-col h-full w-full">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
                <Sparkles className="h-4 w-4 text-white dark:text-black" />
              </div>
              <div>
                <h1 className="text-sm font-semibold">EVA</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleTheme()}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'chat' ? 'settings' : 'chat')}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  activeTab === 'settings'
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                title={activeTab === 'chat' ? 'Settings' : 'Chat'}
              >
                {activeTab === 'chat' ? (
                  <Settings className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <Home newBotMessage={newBotMessage} onNewBotMessageShown={() => setNewBotMessage(null)} />
          )}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}