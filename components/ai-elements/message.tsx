import * as React from "react"
import { cn } from "@/lib/utils"
import { Streamdown } from "streamdown"

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function MessageContent({ className, children, ...props }: MessageContentProps) {
  return (
    <div
      className={cn("relative flex w-full flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface MessageResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: string
  isStreaming?: boolean
}

export function MessageResponse({ className, children, isStreaming, ...props }: MessageResponseProps) {
  if (!children) {
    if (isStreaming) {
      return (
        <div className="flex items-center gap-1.5 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:0.2s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:0.4s]" />
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-p:my-1 prose-p:leading-relaxed",
        "prose-ul:my-1 prose-ol:my-1",
        "prose-li:my-0.5",
        "prose-headings:my-2 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
        "prose-pre:p-2 prose-pre:rounded-lg prose-pre:bg-muted/50",
        "prose-code:text-sm prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-blockquote:border-l-2 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground",
        "prose-a:text-foreground prose-a:underline",
        "prose-table:my-2 prose-td:border prose-td:p-1.5 prose-th:border prose-th:p-1.5",
        className
      )}
      {...props}
    >
      <Streamdown>{children}</Streamdown>
    </div>
  )
}

interface MessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function MessageActions({ className, children, ...props }: MessageActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface MessageActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string
}

export function MessageAction({ className, children, tooltip, ...props }: MessageActionProps) {
  return (
    <button
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
        className
      )}
      title={tooltip}
      {...props}
    >
      {children}
    </button>
  )
}

interface MessageToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function MessageToolbar({ className, children, ...props }: MessageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1 pt-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "user" | "assistant"
}

export function Message({ className, variant = "assistant", children, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        "group relative flex w-full gap-2 px-4 py-4",
        variant === "user" && "justify-end",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
