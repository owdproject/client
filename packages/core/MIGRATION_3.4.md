# Migration 3.4 — PrimeVue out of core

## Summary

- **@owdproject/core** no longer installs PrimeVue. Module-time authoring lives in `kit/` (not auto-imported). Shell composables, utils, and hint components use `runtime/` (`composables`, `utils`, `constants`, `components/Desktop/`).
- **@owdproject/module-fs** — ZenFS virtual filesystem + headless explorer (composables, stores, utils; no `.vue`).
- **@owdproject/kit-primevue** — Nuxt PrimeVue module, `createDesktopDialogs`, optional explorer UI (`DesktopExplorer*`; `{ explorer: false }` for dialogs only).
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
| `@owdproject/core/runtime/utils/utilApp` (`registerTailwindPath`) | `@owdproject/core/kit/authoring` |
| `runtime/utils/utilHasDesktop` | `runtime/composables/useDesktopManifest` (`hasDesktop*`) |
| `runtime/utils/windowMaximizeLayout` | `runtime/utils/utilWindowMaximizeLayout` |
| `runtime/utils/utilWindow` | `runtime/utils/utilWindowControllerAdapter` |

## module-fs

Use `useDesktopShellIdentity` from `@owdproject/core/runtime/composables/useDesktopShellIdentity`.

**ZenFS boundary:** `@zenfs/core` (and `@zenfs/dom`, `@zenfs/archives`) are imported only inside `@owdproject/module-fs`. Do not import `@zenfs/*` from `kit-primevue`, themes, or core — use module-fs runtime APIs (e.g. `fetchExplorerEntryMetadata`, `useExplorerWindow`).

Headless explorer: `useExplorerTabs`, `createExplorerWindowMenuItems`, `useExplorerStore`, DnD composables — all from `@owdproject/module-fs/runtime/...`. `useExplorerWindow(window, t)` defaults to `createExplorerFsOperations`.

## Shell identity

See client `DESKTOP_KERNEL.md` (`useDesktopShellIdentity`) and the docs site page **Shell identity** (`packages/docs/content/7.internals/6.shell-identity.md` — publish from the docs repo only; do not commit `packages/docs` into the client repo if that is your policy).
