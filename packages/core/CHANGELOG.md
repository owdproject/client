## 3.3.2 (2026-06-01)

### 🚀 Features

- Add `defineDesktopModule`, `defineDesktopTheme`, `setDesktopExtensionConfig`, `installDesktopPackage` (core bootstrap), and `mergeDesktopExtensionConfig` for extension/theme authoring.
- Add runtime composables: `useDesktopConfig`, `useDesktopExtension`, `hasDesktopModule`, `hasDesktopApp`, `hasDesktopExtension`.
- Extension packages augment `DesktopConfig` via `types/desktop.d.ts` (`terminal`, `fs`, …) instead of hard-coding keys in core.

### 🩹 Fixes

- Merge the full `desktop.config.ts` export into `runtimeConfig.public.desktop` (including `theme`, `apps`, `modules`, and extension namespaces).
- Remove misleading “unknown desktop key” warnings for valid extension keys (`fs`, `terminal`, custom app namespaces); only warn keys that look like Nuxt options (`ssr`, `vite`, …).
- `app-terminal` no longer overwrites `desktop.config` `terminal` with module defaults only; UI reads `public.desktop.terminal`.

### 📚 Documentation

- Update `desktop-config` setup doc and `DESKTOP_KERNEL.md` for 3.3.2 merge and API (supersedes 3.3.0 `splitDesktopUserConfig` / allowlist description).

### 🔧 Internal

- Remove `splitDesktopUserConfig` (was not a public export).

## 3.3.0 (2026-05-31)

### ⚠️ Breaking Changes

- Rename kernel Vue components from `Core*` to `Desktop*` (e.g. `CoreDesktop` → `DesktopCore`, `CoreWindow` → `DesktopWindow`). Themes must update their templates.
- Remove explorer from kernel: `DesktopExplorer*` components, `useDesktopExplorerStore`, and `explorer` slice in `useDesktopStore` moved to `@owdproject/kit-fs` (`useExplorerStore`, `KitFsExplorer*`).
- `desktop.config.ts` is no longer spread onto `_nuxt.options`; only `runtimeConfig.public.desktop` / `appConfig.desktop` receive shell keys.

### 🚀 Features

- Add `splitDesktopUserConfig` with allowlist warnings for misconfigured keys.
- Shell config merge uses `defu` (UnJS) instead of custom `deepMerge` / `mergeDesktopShell`.
- Add window manager contract tests and [`DESKTOP_KERNEL.md`](DESKTOP_KERNEL.md).

## 3.2.0 (2026-05-22)

### 🚀 Features

- Workspace edge drop helpers moved to `@owdproject/kit-theme` (`useWorkspaceEdgeDrop`).
- Desktop config and module playground validation aligned with Nuxt 4 module authoring.

## 3.1.4 (2025-05-22)

### 🚀 Features

- Allow apps to have a menu ([4bfea74](https://github.com/owdproject/client/commit/4bfea74))
- Add methods to better handle window changes ([54d1346](https://github.com/owdproject/client/commit/54d1346))
- Check if owd.config.ts is available and valid ([4920302](https://github.com/owdproject/client/commit/4920302))
- Add fit-parent to CoreWindow.vue ([59e068c](https://github.com/owdproject/client/commit/59e068c))
- Add focus() to WindowController and set methods as public (deprecate actions) ([710f7be](https://github.com/owdproject/client/commit/710f7be))
- Add owd global command ([f98c74c](https://github.com/owdproject/client/commit/f98c74c))
- Add useClipboardFs.ts composable ([cf934f4](https://github.com/owdproject/client/commit/cf934f4))
- Add window utils in ApplicationController.ts ([ffc97d0](https://github.com/owdproject/client/commit/ffc97d0))
- Export most used functions from core ([6635af7](https://github.com/owdproject/client/commit/6635af7))
- Merge owd.config.ts with nuxt.config.ts in module.ts ([069243c](https://github.com/owdproject/client/commit/069243c))
- Implement basic owd.config.ts ([d052552](https://github.com/owdproject/client/commit/d052552))
- Rewrite project ([cbbd45d](https://github.com/owdproject/client/commit/cbbd45d))

### 🩹 Fixes

- Add key on CoreApplicationWindowsRender v-for ([d2e8e3c](https://github.com/owdproject/client/commit/d2e8e3c))
- Check if entries property is set before normalizing in utilApp.ts ([6092c33](https://github.com/owdproject/client/commit/6092c33))
- Add missing min-width ([aa0c1b5](https://github.com/owdproject/client/commit/aa0c1b5))
- Minor improvements ([7f79208](https://github.com/owdproject/client/commit/7f79208))
- Fix imports ([44740cd](https://github.com/owdproject/client/commit/44740cd))
- Set window starting positionZ to 0 ([b99352e](https://github.com/owdproject/client/commit/b99352e))
