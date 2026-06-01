# Desktop kernel contract

Public surface of `@owdproject/core` for themes, apps, and modules. Internal implementation lives under `runtime/internal/` and is not part of this contract.

## Bootstrap order

1. Load `desktop.config.ts` (or legacy `owd.config.ts`) from the Nuxt root.
2. Validate config; warn only on keys that look like Nuxt options (`ssr`, `vite`, …).
3. Merge the **full** export into `runtimeConfig.public.desktop` (plus `coreVersion`). Same object is assigned to `appConfig.desktop`. Never spread onto `_nuxt.options`.
4. Install **Pinia**, then **theme → modules → apps** via `installDesktopPackage` (passes `desktop[configKey]` when a package declares `meta.configKey`).
5. Client plugin `desktop-register-desktop-apps` flushes queued `defineDesktopApp` calls after Pinia is active.

## Public API

### Configuration

| Export | Use |
|--------|-----|
| `defineDesktopConfig({ theme, apps, modules, ... })` | Root `desktop.config.ts` |
| `defineDesktopModule` / `defineDesktopTheme` | Authoring extension modules and themes |
| `runtimeConfig.public.desktop` | Full merged config (manifest + shell + extension namespaces) |
| `useDesktopConfig()` | Reactive access to `public.desktop` |
| `useDesktopExtension(key)` | One extension namespace (`fs`, `terminal`, …) |
| `hasDesktopModule` / `hasDesktopApp` / `hasDesktopExtension` | Manifest and extension checks |
| `useDesktopManager().setConfig()` | Runtime shell overrides on `appConfig.desktop` |

Shell keys in core types: `name`, `defaultApps`, `features`, `systemBar`, `dockBar`, `workspaces`, `explorer`, `docs`. Extension keys (`fs`, `terminal`, …) are typed via **module augmentation** in each package (`types/desktop.d.ts`), not an allowlist in core.

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

Overview **live fit** (`useWorkspaceOverviewLiveScale`) and optional **snapshot capture** (`useWorkspaceOverviewCapture` / html2canvas) are **not** in core — use them from `@owdproject/kit-theme` in the theme. Edge drop while **not** in overview is also kit-theme (`useWorkspaceEdgeDrop`).

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
5. Prefer `defineDesktopTheme` so shell defaults merge with `defu(public.desktop, themeDefaults)`.

## Extension packages

| Package | Layer |
|---------|--------|
| `@owdproject/kit-theme` | Dialogs, workspace edge drop, overview thumbnail capture (`useWorkspaceOverviewCapture`), shared shell composables |
| `@owdproject/kit-fs` | Explorer UI + `useExplorerStore` |
| `@owdproject/module-fs` | ZenFS virtual filesystem (`defineDesktopModule`, `configKey: 'fs'`) |
| `@owdproject/module-persistence` | Pinia persistence (optional) |
| `@owdproject/app-terminal` | Terminal app (`configKey: 'terminal'`) |

## Versioning

Breaking changes to this contract require a semver major (or minor with explicit `BREAKING CHANGE` in changelog) and coordinated theme updates in separate repos.
