---
title: "Module playground"
description: "Develop and demo OWD apps and themes in isolation"
category: "main"
---

# Module playground

Each publishable **app** or **theme** can ship a small Nuxt app under `playground/` so you can develop and demo it without running the full Open Web Desktop monorepo shell.

## Quick start

From the package directory (e.g. `@owdproject/app-about`):

```bash
pnpm install
pnpm run dev:prepare
pnpm run dev
```

Static demo build (same output as GitHub Pages):

```bash
pnpm run dev:generate
```

Preview: `npx serve playground/.output/public`

## What the playground loads

- **`@owdproject/core`** — desktop shell, windows, app manager
- **`desktop.config.ts`** — usually only your app (or theme) plus **`@owdproject/theme-nova`** as the reference UI shell
- **`app/app.vue`** — renders `<Desktop />` from the active theme

## GitHub Pages

Standalone repos deploy on push to `main`:

- Workflow: `.github/workflows/pages.yml`
- Base path: `NUXT_APP_BASE_URL=/your-repo-name/` (must match `https://owdproject.github.io/your-repo-name/`)
- Enable **Settings → Pages → GitHub Actions**

Live examples:

- [app-about](https://owdproject.github.io/app-about/)
- [app-wasmboy](https://owdproject.github.io/app-wasmboy/)

## Monorepo contributors

In `owdproject/client`, run `pnpm run prepare:apps` or `prepare:themes` after changing module source so `dist/module.mjs` exists before the main `desktop/` app loads the package.

Detailed playbook (migration from legacy layout, file templates, troubleshooting): see the client repo [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](https://github.com/owdproject/client/blob/main/docs/agents/OWD_APP_MODULE_PLAYGROUND.md).
