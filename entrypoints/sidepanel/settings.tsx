import React from "react";
import { ThemeSettings } from "@/components/settings/theme-settings.tsx";
import { I18nSettings } from "@/components/settings/i18n-settings.tsx";
import { ModelSettings } from "@/components/settings/model-settings.tsx";

export function SettingsPage() {
  return (
    <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
      <I18nSettings />
      <ThemeSettings />
      <ModelSettings />
    </div>
  );
}
