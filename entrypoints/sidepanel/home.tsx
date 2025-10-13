import React, { useRef, useEffect, useState } from "react";
import { ChatContainer, ChatInput, ChatMessage } from "@/components/ui/chat";
import { AgentInterface } from "@/components/agent/agent-interface";
import { useTranslation } from "react-i18next";
import { browser } from "wxt/browser";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Sparkles,
  ChevronRight,
  ArrowUp,
  Circle
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
}

interface HomeProps {
  newBotMessage: string | null;
  onNewBotMessageShown: () => void;
}

export function Home({ newBotMessage, onNewBotMessageShown }: HomeProps) {
  const { t } = useTranslation();
  const [useAgentMode, setUseAgentMode] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 从存储中加载用户偏好
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const data = await browser.storage.local.get('agentMode');
      setUseAgentMode(data.agentMode !== false);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const saveUserPreferences = async (agentMode: boolean) => {
    try {
      await browser.storage.local.set({ agentMode });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  useEffect(() => {
    // 滚动到最新消息
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (newBotMessage && !useAgentMode) {
      setIsTyping(true);
      setTimeout(() => {
        addMessageToChat({
          id: `bot-${Date.now()}`,
          text: newBotMessage,
          isUser: false,
        });
        setIsTyping(false);
        onNewBotMessageShown();
      }, 1000);
    }
  }, [newBotMessage, useAgentMode]);

  const addMessageToChat = (message: {
    id: string;
    text: string;
    isUser: boolean;
    isStreaming?: boolean;
  }) => {
    const newMessage: Message = {
      id: message.id,
      content: message.text,
      isUser: message.isUser,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      isStreaming: message.isStreaming,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const updateMessageInChat = (
    id: string,
    newText: string,
    isStreaming: boolean
  ) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              content: newText,
              isStreaming: isStreaming,
            }
          : msg
      )
    );
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const messageText = inputValue.trim();
    setInputValue("");

    // 添加用户消息
    addMessageToChat({
      id: `user-${Date.now()}`,
      text: messageText,
      isUser: true,
    });

    // 发送消息给background script处理
    try {
      setIsTyping(true);
      const botMessageId = `bot-${Date.now()}`;

      // 添加临时AI消息
      addMessageToChat({
        id: botMessageId,
        text: "",
        isUser: false,
        isStreaming: true,
      });

      await browser.runtime.sendMessage({
        type: 'AI_REQUEST',
        userMessage: messageText
      });
    } catch (error) {
      console.error('Error sending message to background:', error);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMode = () => {
    const newMode = !useAgentMode;
    setUseAgentMode(newMode);
    saveUserPreferences(newMode);
  };

  if (useAgentMode) {
    return <AgentInterface />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-xs mx-auto">
            <div className="mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Welcome to EVA</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Your AI-powered browser assistant. Ask me anything or I can help you automate tasks on this page.
              </p>
            </div>

            <div className="space-y-2 w-full">
              <button
                onClick={() => setInputValue("Summarize this page")}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">Summarize this page</span>
                  <ArrowUp className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
              </button>
              <button
                onClick={() => setInputValue("What can you help me with?")}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">What can you help me with?</span>
                  <ArrowUp className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
              </button>
            </div>

            <button
              onClick={toggleMode}
              className="mt-6 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Switch to Agent Mode →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-none",
                  message.isUser ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 mt-1",
                  message.isUser
                    ? "bg-black dark:bg-white"
                    : "bg-gray-100 dark:bg-gray-800"
                )}>
                  {message.isUser ? (
                    <User className="h-4 w-4 text-white dark:text-black" />
                  ) : (
                    <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </div>

                <div className={cn(
                  "flex-1 space-y-1",
                  message.isUser ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-2 max-w-[280px] break-words",
                    message.isUser
                      ? "bg-black dark:bg-white text-white dark:text-black ml-auto"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}>
                    {message.isStreaming ? (
                      <div className="flex items-center gap-1">
                        <Circle className="h-1 w-1 animate-pulse fill-current" />
                        <Circle className="h-1 w-1 animate-pulse fill-current" style={{ animationDelay: '0.2s' }} />
                        <Circle className="h-1 w-1 animate-pulse fill-current" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>
                  {message.timestamp && !message.isStreaming && (
                    <p className={cn(
                      "text-xs text-gray-500 dark:text-gray-400",
                      message.isUser ? "text-right" : "text-left"
                    )}>
                      {message.timestamp}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
                  <div className="flex items-center gap-1">
                    <Circle className="h-1 w-1 animate-pulse fill-current text-gray-600 dark:text-gray-400" />
                    <Circle className="h-1 w-1 animate-pulse fill-current text-gray-600 dark:text-gray-400" style={{ animationDelay: '0.2s' }} />
                    <Circle className="h-1 w-1 animate-pulse fill-current text-gray-600 dark:text-gray-400" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask EVA anything..."
            className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 pr-12 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50"
            rows={1}
            disabled={isTyping}
            style={{
              minHeight: '48px',
              maxHeight: '120px',
              height: 'auto'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />

          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className={cn(
              "absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg transition-all",
              inputValue.trim() && !isTyping
                ? "bg-black dark:bg-white text-white dark:text-black hover:scale-105"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            EVA can make mistakes. Consider checking important information.
          </p>
          <button
            onClick={toggleMode}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Agent Mode →
          </button>
        </div>
      </div>
    </div>
  );
}