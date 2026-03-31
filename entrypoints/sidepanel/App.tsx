import React, { useEffect, useState } from "react"
import "../../assets/main.css"
import { browser } from "wxt/browser"
import ExtMessage, { MessageType } from "@/entrypoints/types.ts"
import { Home } from "@/entrypoints/sidepanel/home.tsx"
import { SettingsPage } from "@/entrypoints/sidepanel/settings.tsx"
import { useTheme } from "@/components/theme-provider.tsx"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Settings, Sparkles } from "lucide-react"

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat')
  const { theme, toggleTheme } = useTheme()
  const { i18n } = useTranslation()
  const [newBotMessage, setNewBotMessage] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const handleMessage = async (message: ExtMessage) => {
      if (message.messageType === MessageType.changeLocale) {
        i18n.changeLanguage(message.content)
      } else if (message.messageType === MessageType.changeTheme) {
        toggleTheme(message.content)
      } else if (message.messageType === MessageType.historyResult) {
        setNewBotMessage(message.content ?? null)
      }
    }

    browser.runtime.onMessage.addListener(handleMessage)
    browser.storage.local.get('i18n').then((data) => {
      if (data.i18n) i18n.changeLanguage(data.i18n)
    })
    setIsInitialized(true)

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  return (
    <div className={cn("flex h-screen w-full flex-col bg-background text-foreground", theme)}>
      {activeTab === 'chat' ? (
        <>
          <header className="flex h-11 flex-shrink-0 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">EVA</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </header>
          <Home newBotMessage={newBotMessage} onNewBotMessageShown={() => setNewBotMessage(null)} />
        </>
      ) : (
        <SettingsPage onBack={() => setActiveTab('chat')} />
      )}
    </div>
  )
}
