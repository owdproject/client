# Migration 3.4 — PrimeVue out of core

## Summary

- **@owdproject/core** no longer installs PrimeVue. Module-time authoring lives in `kit/` (not auto-imported). Shell composables, utils, and hint components use `runtime/` (`composables`, `utils`, `constants`, `components/Desktop/`).
- **@owdproject/module-fs** — ZenFS virtual filesystem + headless explorer (composables, stores, utils; no `.vue`).
- **@owdproject/kit-primevue** — Nuxt PrimeVue module, Tailwind v3 + `tailwindcss-primeui`, `createDesktopDialogs`, optional explorer UI (`DesktopExplorer*`; `{ explorer: false }` for dialogs only).
- **Tailwind** — no longer installed by core; `@owdproject/kit-primevue` (`desktop-kit-primevue`) installs `@nuxtjs/tailwindcss` during kit `setup` and merges registered content globs on the `tailwindcss:config` hook (after theme/apps have called `registerTailwindPath`).
- **@owdproject/kit-theme**, **kit-fs**, **kit-explorer** — deprecated (empty Nuxt modules). **No Vite import shims** — update sources to explicit paths below.

## Stacks (what is optional)

| Stack | `desktop.config` `modules` | Theme |
|-------|---------------------------|--------|
| Desktop only | — (no `module-fs`) | theme only |
| PV dialogs | — | `installModule('@owdproject/kit-primevue', { explorer: false })` |
| PV file explorer | `['@owdproject/module-fs', …]` | `installModule('@owdproject/kit-primevue')` |

`module-fs` is optional at the **app** level (omit from `desktop.config` if you do not need a VFS). It is **required** when you mount `DesktopExplorer*` (default `kit-primevue`).

## Themes (demo PV)

```ts
await installModule('@owdproject/kit-primevue')
```

Dialogs only (no explorer components, no `module-fs`):

```ts
await installModule('@owdproject/kit-primevue', { explorer: false })
```

Remove `kit-theme`, `kit-explorer` from `package.json` / `installModule`. Keep mounting theme `<ConfirmDialog />` groups.

Dialog plugin example (core inject key):

```ts
import { DESKTOP_DIALOG_PROVIDER_KEY } from '@owdproject/core/runtime/constants/desktopShellKeys'
import { createDesktopDialogs } from '@owdproject/kit-primevue/runtime/dialogs/createDesktopDialogs'
```

Or rely on kit-primevue client plugin (no theme plugin needed).

## Imports

| Old | New |
|-----|-----|
| `@owdproject/kit-theme/runtime/composables/*` | `@owdproject/core/runtime/composables/*` |
| `@owdproject/kit-fs/runtime/*` (headless) | `@owdproject/module-fs/runtime/*` |
| `@owdproject/kit-explorer/runtime/composables/*` | `@owdproject/module-fs/runtime/composables/*` |
| `@owdproject/kit-explorer/runtime/components/*` | `@owdproject/kit-primevue/runtime/components/explorer/*` |
| `@owdproject/kit-fs/runtime/components/*` | `@owdproject/kit-primevue/runtime/components/explorer/*` |
| `createDesktopDialogs` from kit-theme | `@owdproject/kit-primevue/runtime/dialogs/createDesktopDialogs` |
| PV explorer UI (Workspace, FileEntry, Frame, …) | `@owdproject/kit-primevue` (`DesktopExplorer*`) |
| Shell snap/edge hints | `@owdproject/core` (`DesktopWindowSnapHintsBase`, `DesktopWorkspaceEdgeHintsBase`) |
| `provideDesktopWorkArea` / `desktopWorkAreaKey` | `useDesktopWorkArea(shellStageRef)` → `useDesktopWindowStore.workArea` |
| `useDesktopWindowDragHandlers` / `*Injected` | `useWindowDragHandlers` |
| `useFileSystemExplorer` | `useExplorerWindow` |
| `@owdproject/core/runtime/utils/defineDesktop*` | `@owdproject/core/kit/authoring` |
| `@owdproject/core/runtime/utils/utilDesktop` (`defineDesktopApp`) | `@owdproject/core/kit/defineDesktopApp` |
| `registerTailwindPath` from core | `@owdproject/kit-primevue/kit/registerTailwindPath` (same function names; import path only) |
| `defineDesktopTheme(definition, import.meta.url)` (auto Tailwind) | `defineDesktopTheme(definition)` + `registerThemeTailwindPath(nuxt, import.meta.url)` after kit-primevue |
| `runtime/utils/utilHasDesktop` | `runtime/composables/useDesktopManifest` (`hasDesktop*`) |
| `runtime/utils/windowMaximizeLayout` | `runtime/utils/utilWindowMaximizeLayout` |
| `runtime/utils/utilWindow` | `runtime/utils/utilWindowControllerAdapter` |

### Tailwind content registration

`@nuxtjs/tailwindcss` is installed by kit-primevue during kit `setup` (not by core). Register globs during each module's `setup`; kit merges them on `tailwindcss:config` when Tailwind loads its config (after all module setups, on `modules:done`).

| Caller | API |
|--------|-----|
| Theme `module.ts` (after `installModule('@owdproject/kit-primevue')`) | `registerThemeTailwindPath(nuxt, import.meta.url)` — defaults to `runtime/components/**` and `runtime/apps/**` |
| Built-in theme apps, extension apps/modules with utility classes | `registerTailwindPath(nuxt, resolve('./path/to/glob'))` from `@owdproject/kit-primevue/kit/registerTailwindPath` |

Kit-primevue merges registered paths into `content.files` (not a plain array — that breaks the generated PostCSS template). Duplicate globs are deduplicated. In dev, `[desktop-kit-primevue] Tailwind content: N paths` is logged when the config hook runs.

## module-fs

Use `useDesktopShellIdentity` from `@owdproject/core/runtime/composables/useDesktopShellIdentity`.

**ZenFS boundary:** `@zenfs/core` (and `@zenfs/dom`, `@zenfs/archives`) are imported only inside `@owdproject/module-fs`. Do not import `@zenfs/*` from `kit-primevue`, themes, or core — use module-fs runtime APIs (e.g. `fetchExplorerEntryMetadata`, `useExplorerWindow`).

Headless explorer: `useExplorerTabs`, `createExplorerWindowMenuItems`, `useExplorerStore`, DnD composables — all from `@owdproject/module-fs/runtime/...`. `useExplorerWindow(window, t)` defaults to `createExplorerFsOperations`.

## Shell identity

See `DESKTOP_KERNEL.md` (`useDesktopShellIdentity`).

## Module naming (3.4)

Runtime identifiers use the `desktop-` prefix. The npm scope `@owdproject/*` and CSS classes/tokens (`.owd-*`, `--owd-*`) are unchanged.

| Surface | 3.4 convention | Legacy (warn only) |
|---------|----------------|-------------------|
| Core Nuxt module `configKey` | `desktop` | `owd` (nuxt.config module options) |
| App `plugin.ts` `name` | `desktop-<slug>-register` | `owd-<slug>-register` |
| App/module `meta.name` | `desktop-app-<slug>` / `desktop-module-<slug>` | `owd-app-*` / `owd-module-*` |
| Theme `meta.name` | `desktop-theme-<slug>` | `owd-theme-*` |
| Desktop manifest file | `desktop.config.ts` | `owd.config.ts` |
| Kernel Vue source files | `runtime/components/<area>/<Name>.vue` + `prefix: 'Desktop'` | `runtime/components/Desktop/<area>/Desktop<Name>.vue` |

Global component names (`DesktopWindow`, `DesktopCore`, …) are unchanged. Deep imports of hint bases: `runtime/components/workspace/WorkspaceEdgeHintsBase.vue`, `runtime/components/window/WindowSnapHintsBase.vue`.

## Pinia store ids (3.4.1)

Pinia store ids were renamed to match the `desktop-*` runtime naming. CSS classes (`.owd-*`) and npm scope (`@owdproject/*`) are unchanged.

| Legacy id | New id |
|-----------|--------|
| `owd/desktop` | `desktop` |
| `owd/desktop/workspace` | `desktop/workspace` |
| `owd/desktop/window` | `desktop/window` |
| `owd/desktop/volume` | `desktop/volume` |
| `owd/desktop/defaultApps` | `desktop/defaultApps` |
| `owd/application/${appId}/windows` | `desktop/application/${appId}/windows` |
| `owd/application/${appId}/meta` | `desktop/application/${appId}/meta` |

When `@owdproject/module-persistence` is installed, persisted state is migrated automatically on the first client boot (`desktop-shell-init` runs `migratePersistedStoreIds` before Pinia hydration). No app or theme code changes are required.

**Breaking only for tools that read raw localStorage keys** (e.g. custom debug scripts expecting `owd/desktop`). In-browser state is preserved via migration.

`pnpm validate:modules` (or `desktop validate`) warns when a package still uses legacy `meta.name: "owd-*"` or Pinia `defineStore` ids containing `owd/`.

Extension modules with their own persisted stores should use the `desktop/<module>/…` id pattern (e.g. `@owdproject/module-fs` explorer: `desktop/module-fs/explorer`). Core migrates only kernel ids (`owd/desktop`, `owd/application/*`); extension packages may omit a localStorage migration — users who already had legacy keys may see a one-time reset of that module's persisted prefs.
