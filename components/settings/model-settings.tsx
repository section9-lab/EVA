import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card.tsx";
import { browser } from "wxt/browser";
import { MessageType } from "@/entrypoints/types.ts";
import { useTranslation } from "react-i18next";
import { AIProviderSettings } from "./ai-provider-settings";

export function ModelSettings() {
  return <AIProviderSettings />;
}
