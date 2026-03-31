import * as React from "react"
import { cn } from "@/lib/utils"
import { ArrowUp, Plus, Square } from "lucide-react"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (message: string) => void
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
  status?: "ready" | "streaming"
  className?: string
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  onStop,
  placeholder = "Ask EVA anything...",
  disabled = false,
  status = "ready",
  className,
}: PromptInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const isStreaming = status === "streaming"

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim())
      onChange("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [])

  return (
    <div className={cn("relative w-full", className)}>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
          style={{ minHeight: "48px", maxHeight: "160px" }}
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={isStreaming && onStop ? onStop : handleSubmit}
            disabled={!value.trim() && !isStreaming}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
              (value.trim() || isStreaming) && !disabled
                ? "bg-black dark:bg-white text-white dark:text-black hover:scale-105"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
            )}
          >
            {isStreaming && onStop ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PromptInputTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PromptInputTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: PromptInputTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={handleInput}
      placeholder={placeholder}
      rows={1}
      disabled={disabled}
      className={cn(
        "w-full resize-none bg-transparent text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none disabled:opacity-50",
        className
      )}
      style={{ minHeight: "48px", maxHeight: "160px" }}
    />
  )
}

interface PromptInputSubmitProps {
  onClick: () => void
  disabled?: boolean
  status?: "ready" | "streaming"
  className?: string
}

export function PromptInputSubmit({
  onClick,
  disabled,
  status = "ready",
  className,
}: PromptInputSubmitProps) {
  const isStreaming = status === "streaming"

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
        !disabled
          ? "bg-black dark:bg-white text-white dark:text-black hover:scale-105"
          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600",
        className
      )}
    >
      {isStreaming ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <ArrowUp className="h-4 w-4" />
      )}
    </button>
  )
}
