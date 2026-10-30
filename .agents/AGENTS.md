> **Current v4 rule (supersedes legacy descriptions below):** the legacy **unscoped `nuxt-desktop`** package is deprecated — no OWD package may depend on or import it. The current scoped distribution **`@owdproject/nuxt-desktop`** (the renamed Nuxt desktop client) is allowed and is the intended entry point. Use `@owdproject/nuxt` for the Nuxt module and Vue shell APIs; `@owdproject/core` is the framework-independent engine. Run `node scripts/check-no-legacy-desktop.mjs` after migration work.
>
> **Framework-first naming:** Nuxt extension packages use `@owdproject/nuxt-{app,module,kit,theme}-*`; React extensions use `@owdproject/react-*`. The engine (`@owdproject/core`), the framework bindings (`@owdproject/nuxt`, `@owdproject/react`, …), the desktop distribution (`@owdproject/nuxt-desktop`) and `*-template` scaffolds are not extensions.

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
| Styling | **Tailwind** via `@owdproject/nuxt-kit-tailwind`; **PrimeVue** via `@owdproject/nuxt-kit-primevue` (theme installs the kit for its UI stack — core 3.4+ does not) |
| Icons / fonts | **@nuxt/icon**, **@nuxt/fonts** |
| i18n | **@nuxtjs/i18n** |
| Extension packages | **@nuxt/module-builder** → published **`dist/module.mjs`** |

---

## Repository map (root = `client/`)

```
client/
├── desktop/                 # @owdproject/nuxt-desktop — Nuxt desktop distribution (primary dev entry)
├── packages/
│   ├── core/                # @owdproject/core — framework-independent engine
│   ├── nuxt/                # @owdproject/nuxt — Nuxt/Vue binding + authoring helpers
│   ├── fs/                  # @owdproject/module-fs — framework-independent ZenFS engine
│   ├── owd-module-fs/       # @owdproject/nuxt-module-fs — Nuxt filesystem module
│   ├── owd-nuxt-module-persistence/ # @owdproject/nuxt-module-pinia-persistence
│   ├── owd-module-atproto*/ # @owdproject/nuxt-module-atproto*
│   ├── owd-kit-nuxt-primevue/  # @owdproject/nuxt-kit-primevue — PrimeVue + tailwindcss-primeui
│   ├── owd-kit-nuxt-tailwind/  # @owdproject/nuxt-kit-tailwind — Tailwind content registration
│   ├── owd-kit-nuxt-ui/     # @owdproject/nuxt-kit-nuxt-ui — Nuxt UI stack (no PrimeVue)
│   ├── react/               # @owdproject/react — React binding
│   └── owd-kit-react95/     # @owdproject/react-kit-react95
├── apps/                    # Desktop apps (@owdproject/nuxt-app-*)
├── themes/                  # Desktop themes (@owdproject/nuxt-theme-*)
├── plugins/                 # Optional workspace slot for future Nuxt plugins
├── template/                # Generated starter (npm create owd) — do not hand-edit
├── packages/core/template-blueprint/  # Maintainer source for template/
├── package.json
├── pnpm-workspace.yaml
└── nx.json
```

**Folder convention:** a desktop distribution collects extensions from **`apps/`**, **`modules/`**, and **`themes/`** (see the extension contract below). The monorepo keeps framework modules under **`packages/*`** and exposes both slots in `DESKTOP_EXTENSION_DIRS`. The **`modules`** field in `desktop.config.ts` is a **list of Nuxt package names** to load, not a filesystem path. `*-template` packages (`@owdproject/app-template`, `@owdproject/module-template`) are scaffolds, not extensions.

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
5. Core installs Pinia, fonts, icons, VueUse, i18n, … **Tailwind and PrimeVue are not installed by core** (since 3.4). The active **theme** installs its UI kit (`kit-nuxt-primevue` for PV themes, or `kit-nuxt-ui` for `@owdproject/nuxt-theme-ui`).
6. Global core components, client plugins, auto-imports from `composables`, `stores`, `utils` (not `runtime/internal/` — kernel controllers are private).

**`runtime/internal/`** — private kernel (`ApplicationController`, `WindowController`). Not auto-imported; use `defineDesktopApp` and `useApplicationManager` instead.

**There is no `packages/core/playground/`.** Develop core through the monorepo **`desktop/`** app, or run `pnpm run dev:prepare` in `packages/core` to stub `dist/` only.

**Public API** (`packages/core/index.ts`, `types/`):

- **`defineDesktopConfig`** — used in `desktop.config.ts`.
- **`defineDesktopApp`** — used in app plugins to register an application (`ApplicationManager`).

**CLI highlights:** `pnpm desktop` (control panel TUI), `desktop dev`, `desktop add`, `desktop validate`, `desktop template` (maintainers).

### Optional packages (summary)

| Package | Role |
|---------|------|
| `@owdproject/nuxt-module-fs` | ZenFS mount + explorer composables; enable in `desktop.config.ts` → `modules`. Explorer app: `@owdproject/app-explorer`. |
| `@owdproject/module-docs` | In-app docs at `/docs` (Nuxt Content). TUI **`[i]`** opens docs when installed. Deprecated alias: `@owdproject/docs`. |
| `@owdproject/nuxt-module-pinia-persistence` | Pinia persistence via IndexedDB. |
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

Nuxt modules (e.g. `@owdproject/nuxt-theme-nova`, `@owdproject/theme-win95`) that provide layout, chrome, styles, and i18n. They may conditionally load extra modules (e.g. FS explorer integration).

**`theme-nova`** is the **reference shell** for app/module playgrounds (Start menu, tray, dock). Smoke test: Start lists apps from the playground’s `desktop.config.ts`.

### `template/`

Output of **`pnpm desktop template`** (from `template-blueprint/` + monorepo `desktop/` + latest npm versions). Used by **`npm create owd`** / **`desktop init`**. Default starter theme: **`@owdproject/nuxt-theme-nova`**.

---

## Playground matrix (representative)

Full migration checklist: [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md).

| Package | Playground | Base theme | Notes |
|---------|------------|------------|--------|
| `@owdproject/nuxt-app-about` | `apps/owd-nuxt-app-about/playground` | `nuxt-theme-nova` | Minimal app reference |
| `@owdproject/nuxt-app-wasmboy` | `apps/owd-nuxt-app-wasmboy/playground` | `nuxt-theme-nova` | Legacy migration example |
| Other `nuxt-app-*` | `apps/<pkg>/playground` | `nuxt-theme-nova` | Standalone repos often ship GitHub Pages |
| `@owdproject/nuxt-module-fs` | `packages/owd-module-fs/playground` | `nuxt-theme-nova` + FS demos | |
| `@owdproject/nuxt-module-pinia-persistence` | `packages/owd-nuxt-module-persistence/playground` | `nuxt-theme-nova` + `nuxt-app-todo` | |
| `@owdproject/nuxt-theme-nova` | `themes/owd-nuxt-theme-nova/playground` | (self) | Reference theme |
| `@owdproject/nuxt-theme-win95` | `themes/owd-nuxt-theme-win95/playground` | (self) + `nuxt-app-about` | Retro reference |
| `@owdproject/core` | **`desktop/`** (no package playground) | `nuxt-theme-nova` | Monorepo integration |

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
| `theme` | Theme package (default: `@owdproject/nuxt-theme-nova`) |
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
3. **`registerTailwindPath`** from `@owdproject/nuxt-kit-tailwind/kit/registerTailwindPath` + `"@owdproject/nuxt-kit-tailwind"` in app **`dependencies`**.
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

---

## UI kits & theme stacks (CRITICAL FOR AGENTS)

Do **not** assume every theme installs PrimeVue or that `registerTailwindPath` lives in `nuxt-kit-primevue`.

### Two UI stacks

| Stack | Example theme | Theme installs | PrimeVue auto-import? |
|-------|---------------|----------------|------------------------|
| **PrimeVue** | `theme-nova`, `theme-win95`, … | `@owdproject/nuxt-kit-primevue` | Yes — `<InputText>`, `<Button>`, dialogs, … |
| **Nuxt UI** | `@owdproject/nuxt-theme-ui` (optional external repo) | `@owdproject/nuxt-kit-nuxt-ui` | **No** |

`@owdproject/nuxt-theme-ui`, `@owdproject/nuxt-kit-nuxt-ui`, and `@owdproject/nuxt-kit-tailwind` are **optional** packages (not required client skeleton submodules). Install via registry or `desktop add` when needed.

### Layering: Tailwind vs PrimeVue

| Package | Role |
|---------|------|
| **`@owdproject/nuxt-kit-tailwind`** | `registerTailwindPath` / `registerThemeTailwindPath`, installs `@nuxtjs/tailwindcss`, merges `desktopTailwindContent` globs |
| **`@owdproject/nuxt-kit-primevue`** | PrimeVue module, `tailwindcss-primeui`, dialogs, optional explorer UI — **should** wrap/install `nuxt-kit-tailwind` (today duplicates Tailwind setup; refactor pending) |

**Apps with Tailwind utility classes in Vue:**

- Import `registerTailwindPath` from **`@owdproject/nuxt-kit-tailwind/kit/registerTailwindPath`**
- Declare **`"@owdproject/nuxt-kit-tailwind": "workspace:*"`** (or semver) in app **`dependencies`**
- This is **build-time** for the app module — independent of which theme is active

**Apps using PrimeVue components in templates** (`InputText`, `Button`, …):

- Do **not** add `nuxt-kit-primevue` to the app for that alone
- Components resolve at **runtime** only when the theme ran `installModule('@owdproject/nuxt-kit-primevue')`
- Apps using PrimeVue markup are **incompatible** with `@owdproject/nuxt-theme-ui` unless refactored to Nuxt UI or plain HTML

**Playground with `nuxt-theme-nova`:** transitively loads `nuxt-kit-primevue` — do not treat that as proof that all themes provide PrimeVue.

---

## Desktop extension contract

A **desktop distribution** (`@owdproject/nuxt-desktop` today; `@owdproject/react-desktop`,
`@owdproject/svelte-desktop`, … later) collects **extensions** from three directories and composes
them into a ready-to-use workspace:

| Directory | Kind | Package convention |
|-----------|------|--------------------|
| `apps/` | `app` | `@owdproject/<framework>-app-*` |
| `modules/` (monorepo: `packages/`) | `module` | `@owdproject/<framework>-module-*` |
| `themes/` | `theme` | `@owdproject/<framework>-theme-*` |
| — (installed by themes) | `kit` | `@owdproject/<framework>-kit-*` |

The minimal declarative contract is `DesktopExtensionMeta`, surfaced through each Nuxt module's
`meta` and read **at build time** by `installDesktopPackage` (loading stays in the framework's
build/config environment — nothing is discovered at runtime):

| Field | Meaning |
|-------|---------|
| `kind` | `app` \| `module` \| `theme` \| `kit` |
| `framework` | `nuxt` \| `vue` \| `react` \| `svelte` \| `angular` \| `astro` — the adapter the extension targets |
| `packageName` | Full package name (framework-first convention) |
| `configKey` | Runtime namespace on `runtimeConfig.public.desktop[...]` |
| `entry` | Build-time entry (Nuxt module); defaults to the package root export |
| `adapter` | Binding required at runtime, e.g. `@owdproject/nuxt` |
| `requires` | Kits/modules the extension expects the theme/desktop to provide |

Helpers exported by `@owdproject/nuxt`:

- `DESKTOP_EXTENSION_DIRS` — default `{ apps, modules, themes }` collection slots.
- `parseDesktopExtensionName(shortName)` — parses `nuxt-app-todo` → `{ framework, kind, name }`.
- `readExtensionMeta(packageName)` — reads the contract from a package's module `meta`.
- `assertDesktopExtensionMeta(meta, pkg)` — validates kind/framework at build time.

`defineDesktopModule` / `defineDesktopTheme` keep accepting `meta.configKey`; the contract fields are
optional and backward compatible. Users list extensions by package name in `desktop.config.ts`
(`theme`, `modules`, `apps`); the desktop validates compatibility before `installModule`.

---

## Workspace & Override Rules (CRITICAL FOR AGENTS)

* **No ad-hoc overrides in `pnpm-workspace.yaml`**: The OWD client repository is designed to be cloned empty of optional extension packages, themes, and apps (containing only `@owdproject/core`, `@owdproject/cli`, and `@owdproject/nx` by default).
* Do **NOT** add overrides (e.g. forcing `workspace:*` for optional packages like `@owdproject/nuxt-module-pinia-persistence` or other modules/apps/themes) in `pnpm-workspace.yaml` or other core configuration files.
* Downstream projects and developers should be able to install and load external/optional packages dynamically without requiring modifications to the client skeleton/workspace files.
* If a package is being resolved from the npm registry instead of a local path during development, the correct approach is to run `pnpm install` or use the `workspace:` protocol in the specific test/theme `package.json` that requires it, rather than setting up workspace-wide overrides.
