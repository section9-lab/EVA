# AGENTS.md — EVA Repository Guide

## Project Overview

EVA is an **intelligent browser agent extension** (Chrome/Edge) built with **TypeScript + React + WXT**. It uses AI (Vercel AI SDK with OpenAI, Anthropic, Google, etc.) and native Chrome extension APIs for lightweight browser automation directly on the user's current page.

## Directory Structure

```
entrypoints/          # WXT extension entry points (background, content, sidepanel, agent)
src/                  # Core source (agent logic, lib utilities)
components/           # React UI components (shadcn/ui + custom)
lib/                  # Shared utilities (ai-providers, utils)
locales/              # i18n (en/, zh_CN/)
playwright-host/      # Legacy Playwright host (deprecated, no longer used)
scripts/              # Utility scripts
.wxt/                 # WXT generated config
.output/              # Build output
```

## Commands

### Development
```bash
npm run dev              # Dev server (Chrome)
npm run dev:firefox      # Dev server (Firefox)
npm run compile          # Type-check (tsc --noEmit)
```

### Build
```bash
npm run build            # Build for Chrome
npm run build:firefox    # Build for Firefox
npm run zip              # Package as zip (Chrome)
npm run zip:firefox      # Package as zip (Firefox)
```

### Testing
**No test framework is currently configured.** `@playwright/test` is in devDependencies but no test files or config exist. To add tests, set up Vitest (unit) or Playwright Test (E2E).

## Code Style

### Imports
- Use **double quotes** for all import paths
- Use `@/` path alias for internal imports (e.g., `@/lib/utils`, `@/components/...`)
- React: `import React, { useState, useEffect } from "react"`
- shadcn: `import * as React from "react"` (namespace alias convention)
- Group imports: external packages → internal modules → relative imports

### TypeScript
- Use **interfaces** for data structures (`interface AgentGoal`, `interface Task`)
- Use **enums** for constants (`enum MessageType`, `enum AgentState`)
- Use **Zod** schemas for runtime validation (`z.object({...})`) with `z.infer` for types
- Avoid `any`; use `Record<string, unknown>` for flexible objects when needed
- Strict null checks preferred

### Naming Conventions
- **PascalCase**: React components, interfaces, enums, type aliases
- **camelCase**: functions, variables, object properties, enum values
- Service classes use **singleton pattern** with `getInstance()`

### React Components
- Functional components with hooks (`useState`, `useEffect`)
- Default export for main components
- Use `cn()` utility for conditional Tailwind classes (shadcn convention)
- Style with Tailwind CSS via `className`; use `dark:` prefix for dark mode

### Error Handling
- Use `try/catch` with `instanceof Error` type guards
- Return result objects: `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- Log errors with `console.error()`; avoid swallowing errors silently
- `@ts-ignore` should be used sparingly and only with a comment explaining why

### Formatting
- No Prettier or ESLint is currently configured — follow existing file patterns
- Be consistent with the file you are editing (indentation, semicolons, quotes)
- Prefer 2-space indentation for new files

## Architecture Notes

- **WXT** is the extension framework (built on Vite); entry points go in `entrypoints/`
- **Vercel AI SDK** (`ai` package) for LLM integration; providers in `lib/ai-providers.ts`
- **Browser automation** uses `ContentScriptBrowserService` via `chrome.scripting.executeScript()` — operates directly on the user's current page, no separate browser process
- **Screenshots** use `chrome.tabs.captureVisibleTab()` — native Chrome API
- **shadcn/ui** components in `components/ui/`; config in `components.json`
- **i18n** uses i18next; translations in `locales/{en,zh_CN}/`

## Commit Guidelines

- Follow conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Write messages in English
- Do not commit secrets, API keys, or `.env` files
