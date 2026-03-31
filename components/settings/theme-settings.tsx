import { browser } from "wxt/browser"
import { MessageType } from "@/entrypoints/types.ts"
import { useTheme } from "@/components/theme-provider.tsx"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeSettings() {
  const { theme, toggleTheme } = useTheme()

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {themes.map((t) => {
        const Icon = t.icon
        const active = theme === t.value
        return (
          <button
            key={t.value}
            onClick={async () => {
              toggleTheme(t.value)
              await browser.runtime.sendMessage({ messageType: MessageType.changeTheme, content: t.value })
              await browser.storage.local.set({ theme: t.value })
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all",
              active ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
