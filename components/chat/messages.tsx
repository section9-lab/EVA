import * as React from "react"
import { cn } from "@/lib/utils"
import { useStickToBottom } from "use-stick-to-bottom"
import { Bot, User, Copy, Check } from "lucide-react"
import { MessageContent, MessageResponse, MessageToolbar } from "@/components/ai-elements/message"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
  isStreaming?: boolean
}

interface MessagesProps {
  messages: ChatMessage[]
  className?: string
}

export function Messages({ messages, className }: MessagesProps) {
  const { scrollRef, contentRef } = useStickToBottom()

  return (
    <div ref={scrollRef} className={cn("flex-1 overflow-y-auto", className)}>
      <div ref={contentRef} className="flex flex-col">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 px-4 py-3",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full mt-0.5",
              msg.role === "user" ? "bg-foreground" : "bg-muted"
            )}>
              {msg.role === "user"
                ? <User className="h-3.5 w-3.5 text-background" />
                : <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </div>

            <div className={cn(
              "max-w-[85%] text-sm leading-relaxed",
              msg.role === "user" ? "text-right" : "text-left"
            )}>
              {msg.role === "user" ? (
                <div className="inline-block rounded-2xl bg-foreground px-3.5 py-2 text-background">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <>
                  <MessageResponse isStreaming={msg.isStreaming}>
                    {msg.content}
                  </MessageResponse>
                  {!msg.isStreaming && msg.content && (
                    <MessageToolbar>
                      <CopyButton content={msg.content} />
                    </MessageToolbar>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    navigator.clipboard?.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [content])

  return (
    <button
      onClick={handleCopy}
      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied
        ? <Check className="h-3 w-3 text-emerald-500" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  )
}
