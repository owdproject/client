# Open Web Desktop (OWD) — Agent & contributor context

This document describes the **OWD client monorepo**: what it is, how it is organized, and how to extend it. Include `@AGENTS.md` in new sessions so assistants do not need the layout explained from scratch.

**Product positioning:** an open, modular **Nuxt module** for building **browser-based desktop experiences** (windows, shell, workspace). Themes shape the “OS” look and feel; apps register programs via `defineDesktopApp`. The repo is meant to be reusable, documented, and approachable for contributors and downstream teams.

**Module playground playbook** (Nuxt module authoring, `nuxt-module-build`, GitHub Pages): [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md). In Cursor, see also `.cursor/rules/owd-app-module-playground.mdc` under `apps/**` and `themes/**`.

---

## One-sentence architecture

A single Nuxt app (`desktop/`) loads **`@owdproject/core`**, which reads **`desktop.config.ts`**, installs **theme → optional modules → apps** (all as Nuxt modules), and provides the shared runtime (Pinia, application/window management, core UI). Themes customize layout and chrome; apps register desktop programs through **`defineDesktopApp`**.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| UI | **Vue 3**, **Nuxt 4** (monorepo desktop is typically SPA: `ssr: false`) |
| Monorepo | **pnpm** workspaces + **Nx** (`nx run desktop:…`) |
| State | **Pinia** |
| Styling | **Tailwind**, **PrimeVue** (theme wired through core) |
| Icons / fonts | **@nuxt/icon**, **@nuxt/fonts** |
| i18n | **@nuxtjs/i18n** |
| Extension packages | **@nuxt/module-builder** → published **`dist/module.mjs`** |

---

## Repository map (root = `client/`)

```
client/
├── desktop/                 # Monorepo Nuxt shell (primary dev entry)
├── packages/
│   ├── core/                # @owdproject/core — orchestration module + desktop CLI
│   ├── module-fs/           # Optional ZenFS virtual filesystem
│   ├── module-docs/         # Optional in-app documentation (Nuxt Content)
│   ├── module-persistence/  # Optional Pinia persistence (IndexedDB)
│   ├── kit-fs/              # Theme-neutral explorer UI (use with module-fs)
│   ├── kit-theme/           # Shared shell composables (session, dialogs, …)
│   └── nx/                  # Nx plugin helpers
├── apps/                    # Desktop apps (@owdproject/app-*)
├── themes/                  # Desktop themes (@owdproject/theme-*)
├── plugins/                 # Optional workspace slot for future Nuxt plugins
├── template/                # Generated starter (npm create owd) — do not hand-edit
├── packages/core/template-blueprint/  # Maintainer source for template/
├── package.json
├── pnpm-workspace.yaml
└── nx.json
```

**Folder convention:** there is **no** top-level `modules/` directory. Shared packages live under **`packages/*`**. The **`modules`** field in `desktop.config.ts` is a **list of Nuxt package names** to load, not a filesystem path.

### `desktop/` — monorepo shell

- **`nuxt.config.ts`** — registers `@owdproject/core`, Nuxt options (host, i18n, `workspaceDir`, …).
- **`desktop.config.ts`** — declarative desktop config (`defineDesktopConfig`): `theme`, `modules`, `apps`.
- **`app/app.vue`** — minimal root; renders the active theme (e.g. `<Desktop />`).
- Window/app logic lives in **core + theme + loaded apps**, not in `desktop/` itself.

### `packages/core/` — `@owdproject/core`

Central Nuxt module and **`desktop`** CLI (`bin/desktop.js`; `owd` is a deprecated alias).

**Startup (logical order):**

1. Initialize `runtimeConfig.public.desktop`.
2. Dynamic import of `desktop.config.ts` from the Nuxt root (`rootDir + '/desktop.config.ts'`). Legacy `owd.config.ts` is still accepted with a console warning. Invalid or missing config **stops** setup.
3. Merge desktop config into `runtimeConfig.public.desktop` (includes **`coreVersion`** from core’s `package.json`).
4. **`installModule`** in order: **theme** → **`modules`** → **`apps`**.
5. Shared stack: PrimeVue, Tailwind (aggregated content paths), Pinia, fonts, icons, VueUse, i18n, …
6. Global core components, client plugins, auto-imports from `composables`, `stores`, `utils`, `controllers`.

**There is no `packages/core/playground/`.** Develop core through the monorepo **`desktop/`** app, or run `pnpm run dev:prepare` in `packages/core` to stub `dist/` only.

**Public API** (`packages/core/index.ts`, `types/`):

- **`defineDesktopConfig`** — used in `desktop.config.ts`.
- **`defineDesktopApp`** — used in app plugins to register an application (`ApplicationManager`).

**CLI highlights:** `pnpm desktop` (control panel TUI), `desktop dev`, `desktop add`, `desktop validate`, `desktop template` (maintainers).

### Optional packages (summary)

| Package | Role |
|---------|------|
| `@owdproject/module-fs` | ZenFS mount + explorer composables; enable in `desktop.config.ts` → `modules`. Explorer app: `@owdproject/app-explorer`. |
| `@owdproject/module-docs` | In-app docs at `/docs` (Nuxt Content). TUI **`[i]`** opens docs when installed. Deprecated alias: `@owdproject/docs`. |
| `@owdproject/module-persistence` | Pinia persistence via IndexedDB. |
| `@owdproject/kit-fs` | Neutral explorer UI components (with `module-fs`). |
| `@owdproject/kit-theme` | Neutral shell composables shared across themes. |

### `apps/*` — desktop applications

Each app is an **`@owdproject/app-*`** Nuxt module:

- **`src/module.ts`** — `defineNuxtModule`, Tailwind paths, runtime config.
- **`src/runtime/plugin.ts`** — typically `defineDesktopApp` on `app:created` (client-only).
- **`src/runtime/app.config.ts`** — `ApplicationConfig` (id, title, windows, entries, commands).
- **`playground/`** — isolated Nuxt app for developing the module (`theme-nova` recommended).
- Build with **`nuxt-module-build`** → **`dist/module.mjs`**.

**Flow:** `desktop.config.ts` lists the package under **`apps`** → core `installModule` → app plugin → `defineDesktopApp` → entries appear in the shell.

### `themes/*` — desktop environments

Nuxt modules (e.g. `@owdproject/theme-nova`, `@owdproject/theme-win95`) that provide layout, chrome, styles, and i18n. They may conditionally load extra modules (e.g. FS explorer integration).

**`theme-nova`** is the **reference shell** for app/module playgrounds (Start menu, tray, dock). Smoke test: Start lists apps from the playground’s `desktop.config.ts`.

### `template/`

Output of **`pnpm desktop template`** (from `template-blueprint/` + monorepo `desktop/` + latest npm versions). Used by **`npm create owd`** / **`desktop init`**. Default starter theme: **`@owdproject/theme-nova`**.

---

## Playground matrix (representative)

Full migration checklist: [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md).

| Package | Playground | Base theme | Notes |
|---------|------------|------------|--------|
| `@owdproject/app-about` | `apps/app-about/playground` | `theme-nova` | Minimal app reference |
| `@owdproject/app-wasmboy` | `apps/app-wasmboy/playground` | `theme-nova` | Legacy migration example |
| Other `app-*` | `apps/<app>/playground` | `theme-nova` | Standalone repos often ship GitHub Pages |
| `@owdproject/module-docs` | `packages/module-docs/playground` | `theme-nova` | Monorepo |
| `@owdproject/module-fs` | `packages/module-fs/playground` | `theme-nova` + FS demos | |
| `@owdproject/module-persistence` | `packages/module-persistence/playground` | `theme-nova` + `app-todo` | |
| `@owdproject/theme-nova` | `themes/theme-nova/playground` | (self) | Reference theme |
| `@owdproject/theme-win95` | `themes/theme-win95/playground` | (self) + `app-about` | Retro reference |
| `@owdproject/core` | **`desktop/`** (no package playground) | `theme-nova` | Monorepo integration |

**Monorepo dev vs publish**

| Command | When |
|---------|------|
| `pnpm install` (repo root) | Runs `prepare:stubs` for all workspace modules, then desktop `nuxt prepare` |
| `pnpm dev` / `nx run desktop:serve` | No manual stub step |
| `npm publish` on `@owdproject/*` packages | `prepack` only (full build); never add `prepare` stub on publishable packages |
| `pnpm run dev:prepare` in a package | Isolated package playground only |

**New app/theme checklist (copy `themes/theme-nova` or `apps/app-about`):**

1. `package.json` scripts: `prepack`, `dev`, `dev:prepare`, `dev:generate` — **no** `prepare`.
2. `exports["."].development` → `./src/module.ts`; `import`/`default` → `./dist/module.mjs`.
3. `playground/` with `desktop.config.ts`, `nuxt.config.ts` (`ssr: false`, `@owdproject/core`).
4. Before publish: `desktop validate .` in the package (fails on `prepare` or missing layout).
5. Monorepo: register path in `pnpm-workspace.yaml`; standalone repo: `pnpm dev` only (runs `dev:prepare`).

**Playground commands:** `dev:prepare`, `dev`, `dev:generate` with `NUXT_APP_BASE_URL=/<repo-slug>/`. Root helpers: `pnpm run prepare:stubs`, `prepare:apps`, `prepare:themes`.

**Standalone demos:** `.github/workflows/pages.yml` → artifact `playground/.output/public`.

---

## `desktop.config.ts`

Canonical file since core **3.2**: **`desktop.config.ts`** next to `nuxt.config.ts`. Legacy **`owd.config.ts`** still works with a deprecation warning.

| Field | Meaning |
|--------|---------|
| `theme` | Theme package (default: `@owdproject/theme-nova`) |
| `modules` | Extra Nuxt modules (FS, persistence, docs, …) |
| `docs` | Options for `@owdproject/module-docs` |
| `apps` | Desktop apps to load |

Merged into **`runtimeConfig.public.desktop`** and **`appConfig.desktop`** for runtime overrides.

---

## Common commands (repo root)

| Command | Purpose |
|---------|--------|
| `pnpm install` | Install workspace |
| `pnpm run prepare:modules` | `dev:prepare` on apps/themes/packages where defined |
| `pnpm desktop` | Control panel TUI (catalog, install, dev server) |
| `pnpm desktop dev` | Foreground dev server |
| `pnpm run dev` | Nx → desktop → `nuxt dev` |
| `pnpm run generate` | Static generate for desktop |
| `pnpm desktop template` | Regenerate `template/` (maintainers) |
| `pnpm run validate:modules` | `desktop validate` across workspace modules |

After changing **module source**, run `dev:prepare` or `prepack` in that package so `dist/` is current.

---

## Creating a new app module (short)

See the full playbook. In brief:

1. `src/module.ts` + `src/runtime/` + `playground/` with `@owdproject/core` and **`theme-nova`**.
2. Client plugin `name: 'owd-app-<slug>-register'` calling **`defineDesktopApp`**.
3. **`registerTailwindPath`** for Vue components.
4. Scripts `dev:prepare`, `dev:generate`; register `apps/<pkg>/playground` in `pnpm-workspace.yaml`.
5. Optional: add to `desktop/desktop.config.ts`; add `pages.yml` for standalone GitHub Pages.

**Validation:** `desktop validate .` from the package directory. **`@owdproject/core`** uses a reduced ruleset (no playground required); other packages follow the full playbook.

---

## Human-facing documentation

- Root **`README.md`** — install, community, links ([owdproject.org](https://owdproject.org)).
- Product docs live in the **`owd-docs`** sibling repo (Docus, **English only**). Useful paths: `/getting-started/introduction`, `/architecture/overview`, `/apps/overview`, `/themes/overview`, `/setup/owd-cli`, `/internals/boot-sequence`.
- Keep **`AGENTS.md`** aligned with the repo when architecture or defaults change.

---

## Design notes (for planning, not blockers)

- **Themes as the UX surface** for different “OS” metaphors while keeping **app APIs** stable.
- **Version alignment** across Nuxt, core, and extension packages (`peerDependencies`, CI).
- **CI contracts** — `dev:prepare` + playground build per published module.
- Document **theme × module × app** compatibility (e.g. FS + explorer + classic themes).

Update this file when conventions change so agents and contributors share one source of truth.
