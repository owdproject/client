# Desktop kernel contract

Public surface of `@owdproject/core` for themes, apps, and modules. Internal implementation lives under `runtime/internal/` and is not part of this contract.

## Bootstrap order

1. Load `desktop.config.ts` (or legacy `owd.config.ts`) from the Nuxt root.
2. Validate and **split** config: `theme` / `apps` / `modules` drive `installModule`; all other keys merge into `runtimeConfig.public.desktop` and `appConfig.desktop` only — never into `_nuxt.options`.
3. Install **Pinia**, then **theme → modules → apps**.
4. Client plugin `desktop-register-desktop-apps` flushes queued `defineDesktopApp` calls after Pinia is active.

## Public API

### Configuration

| Export | Use |
|--------|-----|
| `defineDesktopConfig({ theme, apps, modules, ... })` | Root `desktop.config.ts` |
| `runtimeConfig.public.desktop` | Shell/runtime flags (`workspaces`, `systemBar`, `explorer`, …) |
| `useDesktopManager().setConfig()` | Runtime shell overrides |

Allowed `desktop.config.ts` shell keys include: `name`, `defaultApps`, `features`, `systemBar`, `dockBar`, `workspaces`, `explorer`, `docs`. Unknown keys are merged with a dev warning. Keys that look like Nuxt options (`ssr`, `vite`, …) are rejected from `_nuxt.options` with a warning — put them in `nuxt.config.ts`.

### Applications

| Export | Use |
|--------|-----|
| `defineDesktopApp(config)` | App plugin (`app:created`, client-only) |
| `useApplicationManager()` | Launch entries, list running apps, resolve open windows |

Apps register via Nuxt modules listed in `desktop.config.ts` → `apps`.

### Kernel Vue components (global)

Registered from `runtime/components` with `pathPrefix: false`:

| Component | Role |
|-----------|------|
| `DesktopCore` | Kernel shell wrapper (props, workspace init, default slot) |
| `DesktopApplicationRender` | Renders running app windows |
| `DesktopWindow` / `DesktopWindowNav` / `DesktopWindowContent` | Window chrome primitives |
| `DesktopBackground` / `DesktopTime` | Optional shell utilities |

Themes expose **`Desktop.vue`** as the theme entry point (`app.vue` → `<Desktop />`). Themes wrap `DesktopCore` and kernel window components with theme-specific chrome.

### Stores & composables (auto-imported)

| Symbol | Role |
|--------|------|
| `useDesktopStore` | Shell state (workspace overview, z-index counter, personalization, default apps) |
| `useDesktopWorkspaceStore` | Active workspace, overview mode |
| `useDesktopWindowStore` | Global z-index increment |
| `useWorkspaceManager` | Overview keyboard + HTML5 drop between workspaces |

Explorer UI state and components live in **`@owdproject/kit-fs`** (`useExplorerStore`, `KitFs*` explorer components), not in core.

### Window lifecycle (internal contract)

`WindowController` (internal) guarantees:

- `focus()` / `actions.bringToFront()` — exclusive focus + monotonic z-index via `useDesktopWindowStore`
- `minimize()` / `unminimize()` — toggles `state.active`
- `setWorkspace(id)` — assigns window to a workspace

Contract tests: `packages/core/test/windowController.contract.test.ts`, `useWorkspaceManager.contract.test.ts`.

## Theme obligations

1. Provide `Desktop.vue` (theme entry) registered as a global component by the theme module.
2. Wrap kernel components; do not reimplement window manager logic in the theme.
3. Use `provide/inject` for `windowController` only inside theme `Window*.vue` wrappers.
4. Install `@owdproject/kit-fs` (and `@owdproject/module-fs` when needed) for filesystem explorer — not via core.

## Extension packages

| Package | Layer |
|---------|--------|
| `@owdproject/kit-theme` | Dialogs, workspace edge drop, shared shell composables |
| `@owdproject/kit-fs` | Explorer UI + `useExplorerStore` |
| `@owdproject/module-fs` | ZenFS virtual filesystem |
| `@owdproject/module-persistence` | Pinia persistence (optional) |

## Versioning

Breaking changes to this contract require a semver major (or minor with explicit `BREAKING CHANGE` in changelog) and coordinated theme updates in separate repos.
