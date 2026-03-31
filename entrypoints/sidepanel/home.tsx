import React, { useEffect, useState } from "react"
import { browser } from "wxt/browser"
import { Messages } from "@/components/chat/messages"
import { ChatInput } from "@/components/chat/ui"
import { Sparkles } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
  isStreaming?: boolean
}

interface HomeProps {
  newBotMessage: string | null
  onNewBotMessageShown: () => void
}

export function Home({ newBotMessage, onNewBotMessageShown }: HomeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  useEffect(() => {
    if (newBotMessage) {
      setIsTyping(true)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "assistant",
            content: newBotMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ])
        setIsTyping(false)
        onNewBotMessageShown()
      }, 800)
    }
  }, [newBotMessage, onNewBotMessageShown])

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const botId = `bot-${Date.now()}`
    const botMsg: ChatMessage = {
      id: botId,
      role: "assistant",
      content: "",
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, botMsg])
    setStreamingMessageId(botId)
    setIsTyping(true)

    try {
      await browser.runtime.sendMessage({
        type: 'AI_REQUEST',
        userMessage: text.trim()
      })
    } catch {
      setIsTyping(false)
      setStreamingMessageId(null)
      setMessages((prev) =>
        prev.map((m) => m.id === botId ? { ...m, isStreaming: false, content: "Something went wrong. Please try again." } : m)
      )
    }
  }

  const handleStop = () => {
    setIsTyping(false)
    setStreamingMessageId(null)
    if (streamingMessageId) {
      setMessages((prev) =>
        prev.map((m) => m.id === streamingMessageId ? { ...m, isStreaming: false, content: m.content || "Stopped." } : m)
      )
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold mb-1">How can I help?</h2>
          <p className="text-xs text-muted-foreground text-center max-w-[220px] mb-6">
            Ask me anything about this page or any task you need help with.
          </p>
        </div>
      ) : (
        <Messages messages={messages} />
      )}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSend}
        onStop={handleStop}
        disabled={isTyping}
        isStreaming={isTyping}
      />
    </div>
  )
}
