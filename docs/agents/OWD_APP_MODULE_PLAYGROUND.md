# OWD app/theme module — playground & `nuxt-module-build`

Playbook for **Cursor agents** and contributors: how to convert or scaffold an `@owdproject/app-*` / `@owdproject/theme-*` package so it can be developed in isolation, built as a Nuxt module (`dist/module.mjs`), and published to **GitHub Pages**.

**Reference implementations:** `apps/app-about`, `apps/app-wasmboy`, `themes/theme-win95`, `packages/module-docs`.

**Related:** [`AGENTS.md`](../../AGENTS.md) (monorepo map), [`packages/core/CONTRIBUTING.md`](../../packages/core/CONTRIBUTING.md).

---

## When to apply this pattern

Use it when a package:

- Is installed by the desktop via `installModule('@owdproject/…')` from `desktop.config.ts` (`apps`, `modules`, or `theme`).
- Should be testable **without** running the full `desktop/` shell.
- May ship as a **standalone GitHub repo** with its own demo on Pages.

Skip the playground only for legacy apps that are monorepo-internal and not published separately (migrate them when touched).

---

## Target layout

```
@owdproject/app-example/
├── src/
│   ├── module.ts              # defineNuxtModule
│   └── runtime/
│       ├── plugin.ts          # defineDesktopApp (apps) or theme setup
│       ├── app.config.ts      # ApplicationConfig (apps only)
│       └── components/…
├── playground/
│   ├── package.json
│   ├── nuxt.config.ts
│   ├── desktop.config.ts
│   ├── tsconfig.json
│   └── app/
│       ├── app.vue              # <Desktop />
│       └── plugins/
│           └── launch-*.client.ts   # optional: auto-open app in dev
├── dist/                      # generated — never edit by hand
├── .github/workflows/
│   ├── pages.yml              # GitHub Pages
│   └── ci.yml                 # optional lint/test
├── package.json
├── tsconfig.json
├── project.json               # optional Nx target → prepack
└── README.md
```

**Legacy layout to migrate:** `module.ts` + `runtime/` at package root → move under `src/`.

---

## 1. `package.json` (module package)

Required fields and scripts (replace `app-example` / repo slug):

```json
{
  "name": "@owdproject/app-example",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/types.d.mts",
      "import": "./dist/module.mjs"
    }
  },
  "main": "./dist/module.mjs",
  "files": ["dist"],
  "scripts": {
    "prepack": "nuxt-module-build build",
    "dev": "pnpm run dev:prepare && cd playground && pnpm exec nuxt dev",
    "dev:build": "nuxt build playground",
    "dev:generate": "NUXT_APP_BASE_URL=${NUXT_APP_BASE_URL:-/app-example/} nuxt generate playground",
    "dev:prepare": "nuxt-module-build build --stub && nuxt-module-build prepare && cd playground && pnpm exec nuxt prepare"
  },
  "dependencies": {
    "@nuxt/kit": "^4.3.0"
  },
  "devDependencies": {
    "@nuxt/module-builder": "^1.0.2",
    "@owdproject/core": "workspace:*",
    "@owdproject/theme-nova": "workspace:*",
    "nuxt": "^4.3.0"
  },
  "peerDependencies": {
    "@owdproject/core": "^3.2.0"
  }
}
```

- **`dev:prepare`** must run before the monorepo `desktop` can load the package (`dist/module.mjs` stub).
- **`NUXT_APP_BASE_URL`** in `dev:generate` must match the GitHub repo name: `/app-about/`, `/app-wasmboy/`, `/theme-win95/`, etc.

---

## 2. `src/module.ts`

```ts
import { defineNuxtModule, createResolver, addComponentsDir, addPlugin } from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'

export default defineNuxtModule({
  meta: { name: 'owd-app-example' },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.alias['owd-app-example'] = resolve('./runtime')

    addComponentsDir({ path: resolve('./runtime/components') })
    addPlugin(resolve('./runtime/plugin'))
    registerTailwindPath(nuxt, resolve('./runtime/components/**/*.{vue,mjs,ts}'))
  },
})
```

Themes: same structure; register theme components/pages/styles instead of `defineDesktopApp`.

---

## 3. `src/runtime/plugin.ts` (desktop apps)

```ts
import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import configAppExample from './app.config'

export default defineNuxtPlugin({
  name: 'owd-app-example-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(configAppExample)
  },
})
```

- Plugin **`name`** is required if the playground uses `dependsOn: ['owd-app-example-register']`.
- Prefer client-only registration (`import.meta.server` guard), not `app:created` hook, to match current apps.

---

## 4. Playground

### `playground/nuxt.config.ts`

```ts
export default defineNuxtConfig({
  modules: ['@owdproject/core'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
  },
  i18n: { strategy: 'no_prefix' },
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  ssr: false,
})
```

### `playground/desktop.config.ts`

```ts
import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  apps: ['@owdproject/app-example'],
  modules: [],
  systemBar: { enabled: true, startButton: true },
})
```

Use **`theme-nova`** as the default shell for app/module playgrounds. Themes use themselves (see `theme-win95/playground`).

### `playground/package.json`

```json
{
  "name": "@owdproject/app-example-playground",
  "private": true,
  "type": "module",
  "dependencies": {
    "@owdproject/app-example": "workspace:*",
    "@owdproject/core": "workspace:*",
    "@owdproject/theme-nova": "workspace:*",
    "nuxt": "^4.4.4"
  }
}
```

### `playground/app/app.vue`

```vue
<template>
  <Desktop />
</template>
```

### Optional: auto-launch in dev

Copy `apps/app-about/playground/app/plugins/launch-about.client.ts` and adapt:

| Constant | Example |
|----------|---------|
| `APP_ID` | `org.owdproject.about` (from `app.config.ts` → `id`) |
| Plugin `dependsOn` | `owd-app-about-register` (plugin `name`) |
| Command | `about` (primary entry command) |

Only runs when `import.meta.dev` is true.

**Important:** run the retry loop inside the `app:mounted` hook only. Do not call `execAppCommand` from plugin `setup()` before the desktop shell is mounted — Vue will throw `Cannot read properties of null (reading 'insertBefore')` when window components patch into a missing parent.

---

## 5. Monorepo wiring

1. **`pnpm-workspace.yaml`** (root) — add explicit playground path:

   ```yaml
   - apps/app-example/playground
   ```

2. **`desktop/package.json`** + **`desktop/desktop.config.ts`** — if the app should appear in the full desktop (optional for playground-only work).

3. After structural changes, from package root:

   ```bash
   pnpm run dev:prepare
   ```

4. From monorepo root (all apps/themes with `dev:prepare`):

   ```bash
   pnpm run prepare:apps
   pnpm run prepare:themes
   ```

---

## 6. GitHub Pages (standalone repo)

Copy `.github/workflows/pages.yml` from `apps/app-about`:

| Step | Command / setting |
|------|-------------------|
| Install | `npx nypm@latest i` |
| Prepare | `npm run dev:prepare` |
| Static build | `npm run dev:generate` |
| `NUXT_APP_BASE_URL` | `/app-example/` (leading and trailing slash) |
| Artifact path | `playground/.output/public` |

**Repo settings:** Pages → **GitHub Actions** as source.

**Public URL:** `https://owdproject.github.io/app-example/`

---

## 7. Commands cheat sheet

| Where | Command | Purpose |
|-------|---------|---------|
| Package | `pnpm run dev:prepare` | Stub/build module + prepare playground |
| Package | `pnpm run dev` | Dev server (playground only) |
| Package | `pnpm desktop dev` | Same as `pnpm run dev` when cwd is the package (auto-detects playground) |
| Package | `pnpm desktop` | Control panel; `[s]` starts playground when launched from the package dir |
| Package | `pnpm run dev:generate` | Static output → `playground/.output/public` |
| Package | `pnpm run prepack` | Production `dist/` before npm publish |
| Root | `pnpm run prepare:apps` | `dev:prepare` on all `apps/*` |
| Root | `pnpm run dev` | Full desktop shell |
| Root | `pnpm desktop dev` | Full desktop shell (unchanged from repo root or `desktop/`) |
| Package | `pnpm run validate` | Check Nuxt module + playground layout (`desktop validate .`) |
| Root | `pnpm run validate:modules` | Validate all `apps/*`, `themes/*`, `packages/*` with `src/module.ts` |

### Automated layout check (`desktop validate`)

The `@owdproject/core` CLI ships **`desktop validate`** to assert that a package matches this playbook (static checks; optional build smoke test).

From the **package root** (standalone repo or monorepo app):

```bash
pnpm run dev:prepare   # creates dist/module.mjs stub first
pnpm run validate      # or: pnpm exec desktop validate .
```

From the **client monorepo root**:

```bash
pnpm run validate:modules
pnpm exec desktop validate apps/app-about
pnpm exec desktop validate --strict --json .
```

| Flag | Purpose |
|------|---------|
| `--json` | Machine-readable report |
| `--strict` | Warnings fail the run (CI policy) |
| `--smoke` | Run `dev:prepare` + `nuxt build playground` (slow; use in CI after install) |

Add `"validate": "desktop validate ."` to the module `package.json` and run it in `.github/workflows/ci.yml` after `dev:prepare`. Unit tests for the validator live in `packages/core/test/validateModule.test.js`.

---

## 8. Migrating a legacy app (checklist)

Use when `module.ts` and `runtime/` still live at package root (e.g. old `app-wasmboy`, `app-dino`).

- [ ] `mkdir src && mv module.ts runtime [types] src/`
- [ ] Update `package.json` (exports, scripts, `@nuxt/module-builder` devDep)
- [ ] Update `tsconfig.json` / `tsconfig.app.json` paths to `src/`
- [ ] Add `playground/` (nuxt + desktop config + `app.vue`)
- [ ] Add launch plugin if UX needs immediate window in dev
- [ ] Register `apps/<name>/playground` in root `pnpm-workspace.yaml`
- [ ] Add `.gitignore` entries: `dist`, `playground/.nuxt`, `playground/node_modules`
- [ ] Add `.github/workflows/pages.yml` (+ `ci.yml` if needed)
- [ ] Run `pnpm run dev:prepare` then `pnpm run dev:generate`
- [ ] Add `"validate": "desktop validate ."` and ensure `pnpm run validate` passes
- [ ] Fix plugin: named register + `import.meta.server` guard
- [ ] Update `AGENTS.md` playground table + package `README.md`

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Could not load @owdproject/app-…. Is it installed?` on `pnpm install` / desktop prepare | Run `pnpm run dev:prepare` inside the app package (creates `dist/module.mjs` stub). |
| Playground blank / app missing in Start menu | Check `desktop.config.ts` → `apps`, plugin runs, `defineDesktopApp` id matches launch plugin. |
| GitHub Pages assets 404 | `NUXT_APP_BASE_URL` must be `/repo-name/` and match Pages URL path. |
| `dependsOn` plugin order error | Set `name` on register plugin; launch plugin lists exact name. |
| WASM / heavy deps fail on generate | May need Vite `optimizeDeps` / `assetsInlineLimit` in playground `nuxt.config` (see wasmboy if added later). |

---

## 10. Agent workflow (summary)

1. Read reference package closest to the target (`app-about` for simple app, `app-wasmboy` for deps/WASM).
2. Apply file tree and `package.json` scripts.
3. Wire playground + optional launch plugin.
4. Update `pnpm-workspace.yaml` and run `dev:prepare` + `dev:generate`.
5. Add/update `pages.yml` for standalone repos.
6. Document in package `README.md` and row in `AGENTS.md` playground table.

Do **not** hand-edit `dist/`; always use `dev:prepare` / `prepack`.
