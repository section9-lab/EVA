import { browser } from "wxt/browser"
import { MessageType } from "@/entrypoints/types.ts"
import languages from "@/components/i18nConfig.ts"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function I18nSettings() {
  const { i18n } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-2">
      {languages.map((lang) => {
        const active = i18n.language === lang.locale
        return (
          <button
            key={lang.locale}
            onClick={async () => {
              await i18n.changeLanguage(lang.locale)
              await browser.runtime.sendMessage({ messageType: MessageType.changeLocale, content: lang.locale })
              await browser.storage.local.set({ i18n: lang.locale })
            }}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-xs font-medium transition-all",
              active ? "border-foreground bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/50"
            )}
          >
            {lang.name}
          </button>
        )
      })}
    </div>
  )
}
