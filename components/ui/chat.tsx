import * as React from "react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { browser } from "wxt/browser"; 
import { createOpenAI } from "@ai-sdk/openai"; // AI SDK import
import { streamText } from "ai"; // AI SDK import for streaming


interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  isUser?: boolean
  message: string
  timestamp?: string
}

const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ className, isUser = false, message, timestamp, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "max-w-[80%] rounded-lg px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <p className="text-sm">{message}</p>
          {timestamp && (
            <p className="mt-1 text-xs opacity-70">{timestamp}</p>
          )}
        </div>
      </div>
    )
  }
)
ChatMessage.displayName = "ChatMessage"

interface ChatContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

const ChatContainer = React.forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-4 p-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ChatContainer.displayName = "ChatContainer"

interface ChatInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSend?: (message: string) => void;
  addMessageToChat: (message: { id: string; text: string; isUser: boolean; isStreaming?: boolean }) => void;
  updateMessageInChat: (id: string, newText: string, isStreaming: boolean) => void;
}

const ChatInput = React.forwardRef<HTMLDivElement, ChatInputProps>(
  ({ className, onSend, addMessageToChat, updateMessageInChat, ...props }, ref) => {
    const { t } = useTranslation()
    const [message, setMessage] = React.useState("")
    const [isSending, setIsSending] = React.useState(false);
    
    const handleSend = async () => {
      if (message.trim() && !isSending) {
        setIsSending(true);
        const userMessageText = message;
        setMessage(""); // Clear input after sending

        const userMessageId = Date.now().toString();
        addMessageToChat({ id: userMessageId, text: userMessageText, isUser: true });

        if (onSend) {
          onSend(userMessageText); 
        }

        try {
          // 1. 从存储中获取模型配置
          const data = await browser.storage.local.get("modelConfig");
          if (data.modelConfig) {
            const config = data.modelConfig as { url?: string; key: string; model: string };
            
            if (!config.key || !config.model) {
              console.error("API key or model name is missing in config.");
              addMessageToChat({
                id: (Date.now() + 1).toString(),
                text: t("error.missingKeyOrModel"), // Ensure this translation key exists
                isUser: false,
              });
              setIsSending(false);
              return;
            }

            const openai = createOpenAI({
              apiKey: config.key,
              baseURL: config.url || undefined,
            });

            const aiMessageId = (Date.now() + 1).toString();
            addMessageToChat({ id: aiMessageId, text: "", isUser: false, isStreaming: true });
            
            let accumulatedResponse = "";
            const { textStream } = await streamText({
              model: openai(config.model),
              prompt: userMessageText,
            });

            for await (const delta of textStream) {
              accumulatedResponse += delta;
              updateMessageInChat(aiMessageId, accumulatedResponse, true);
            }
            updateMessageInChat(aiMessageId, accumulatedResponse, false); // Mark streaming as complete

          } else {
            
            console.error("Model configuration not found.");
            addMessageToChat({
              id: (Date.now() + 1).toString(),
              text: t("error.modelConfigNotFound"), // Ensure this translation key exists
              isUser: false,
            });
          }
        } catch (error) {
          console.error("Error calling AI model:", error);
          addMessageToChat({
            id: (Date.now() + 1).toString(),
            text: t("error.aiError") + (error.message ? `: ${error.message}` : ""), // Ensure this translation key exists
            isUser: false,
          });
        }
        setIsSending(false);
      }
    }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center space-x-2 border-t p-4",
          className
        )}
      >
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t('inputPlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          {...props}
        />
        <button
          onClick={handleSend}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
           {isSending ? t('sending') : t('send')}
        </button>
      </div>
    )
  }
)
ChatInput.displayName = "ChatInput"

export { ChatMessage, ChatContainer, ChatInput }