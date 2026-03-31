import * as React from "react"
import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  isStreaming,
  placeholder = "Ask EVA...",
}: ChatInputProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim())
      onChange("")
      if (ref.current) ref.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleInput = () => {
    if (ref.current) {
      ref.current.style.height = "auto"
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-border bg-background p-3">
      <div className="relative rounded-xl border border-border bg-card">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />
        <button
          onClick={isStreaming && onStop ? onStop : submit}
          disabled={!value.trim() && !isStreaming}
          className={cn(
            "absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-lg transition-all",
            (value.trim() || isStreaming) && !disabled
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isStreaming && onStop ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
        EVA can make mistakes. Check important info.
      </p>
    </div>
  )
}
