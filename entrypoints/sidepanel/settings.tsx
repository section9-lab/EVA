import React, { useState } from "react"
import { ThemeSettings } from "@/components/settings/theme-settings.tsx"
import { I18nSettings } from "@/components/settings/i18n-settings.tsx"
import { ModelSettings } from "@/components/settings/model-settings.tsx"
import { ArrowLeft, Check } from "lucide-react"

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-border px-4">
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">AI Provider</h3>
          <ModelSettings />
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Appearance</h3>
          <ThemeSettings />
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Language</h3>
          <I18nSettings />
        </section>

        <section className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold mb-1">About EVA</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Version 0.0.1</p>
            <p>Built with Vercel AI SDK</p>
          </div>
        </section>
      </div>
    </div>
  )
}
