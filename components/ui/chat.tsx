import * as React from "react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { browser } from "wxt/browser"; 
import { createOpenAI } from "@ai-sdk/openai"; 
import { streamText } from "ai"; 


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

interface ChatInputProps extends React.InputHTMLAttributes<HTMLTextAreaElement> {
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
          // 1. 尝试使用AI意图识别服务
          const aiResponseMessageId = (Date.now() + 1).toString();
          addMessageToChat({
            id: aiResponseMessageId,
            text: "正在分析您的意图...",
            isUser: false,
            isStreaming: true
          });

          // 发送AI请求到background script
          await browser.runtime.sendMessage({
            type: 'AI_REQUEST',
            userMessage: userMessageText
          });

          // 设置监听器接收AI响应
          const handleAIResponse = async (response: any) => {
            if (response.type === 'AI_RESPONSE') {
              if (response.success) {
                if (response.isChat) {
                  // 普通聊天，使用AI模型
                  await handleNormalChat(userMessageText, aiResponseMessageId);
                } else {
                  // 任务执行成功
                  let responseText = response.message;

                  if (response.task) {
                    responseText += `\n\n任务详情:\n`;
                    responseText += `描述: ${response.task.description}\n`;
                    responseText += `步骤数: ${response.task.steps.length}\n`;
                    responseText += `状态: ${response.task.status}`;
                  }

                  if (response.result) {
                    responseText += `\n\n执行结果:\n`;
                    responseText += `成功: ${response.result.success ? '是' : '否'}\n`;
                    responseText += `执行时间: ${response.result.totalExecutionTime}ms`;

                    if (response.result.stepResults.length > 0) {
                      responseText += `\n步骤结果:\n`;
                      response.result.stepResults.forEach((step: any, index: number) => {
                        responseText += `${index + 1}. ${step.success ? '✅' : '❌'} ${step.error || '成功'}\n`;
                      });
                    }
                  }

                  updateMessageInChat(aiResponseMessageId, responseText, false);
                }
              } else {
                // AI响应失败
                let errorText = response.message || "处理请求时发生错误";
                if (response.errors && response.errors.length > 0) {
                  errorText += "\n\n错误详情:\n" + response.errors.join("\n");
                }
                updateMessageInChat(aiResponseMessageId, errorText, false);
              }

              // 移除监听器
              browser.runtime.onMessage.removeListener(handleAIResponse);
            }
          };

          // 添加监听器
          browser.runtime.onMessage.addListener(handleAIResponse);

          // 设置超时
          setTimeout(() => {
            browser.runtime.onMessage.removeListener(handleAIResponse);
            updateMessageInChat(aiResponseMessageId, "请求超时，请稍后重试。", false);
            setIsSending(false);
          }, 30000);

        } catch (error) {
          console.error("Error processing message:", error);

          // 回退到普通聊天
          await handleNormalChat(userMessageText, (Date.now() + 1).toString());
        }
        setIsSending(false);
      }
    }

    // 处理普通聊天功能
    const handleNormalChat = async (userMessageText: string, messageId: string) => {
      try {
        // 从存储中获取模型配置
        const data = await browser.storage.local.get("modelConfig");
        if (data.modelConfig) {
          const config = data.modelConfig as { url?: string; key: string; model: string };

          if (!config.key || !config.model) {
            console.error("API key or model name is missing in config.");
            updateMessageInChat(messageId, t("error.missingKeyOrModel"), false);
            return;
          }

          const openai = createOpenAI({
            apiKey: config.key,
            baseURL: config.url || undefined,
          });

          updateMessageInChat(messageId, "正在思考...", true);

          let accumulatedResponse = "";
          const { textStream } = await streamText({
            model: openai(config.model),
            prompt: userMessageText,
          });

          for await (const delta of textStream) {
            accumulatedResponse += delta;
            updateMessageInChat(messageId, accumulatedResponse, true);
          }
          updateMessageInChat(messageId, accumulatedResponse, false);
        } else {
          console.error("Model configuration not found.");
          updateMessageInChat(messageId, t("error.modelConfigNotFound"), false);
        }
      } catch (error) {
        console.error("Error calling AI model:", error);
        updateMessageInChat(messageId, t("error.aiError") + (error ? `: ${error}` : ""), false);
      }
    }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center space-x-1 border-t p-2",
          className
        )}
      >
        <textarea
          // type="text"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          placeholder={t('inputPlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          {...props}
        />
        <button
          onClick={handleSend}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-3 py-2"
        >
           {isSending ? t('sending') : t('send')}
        </button>
      </div>
    )
  }
)
ChatInput.displayName = "ChatInput"

export { ChatMessage, ChatContainer, ChatInput }