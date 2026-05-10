<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Kit Theme</h1>
<h3 align="center">
  Shared shell patterns for Open Web Desktop themes (neutral composables, no visual chrome).
</h3>

<br />

## Overview

`@owdproject/kit-theme` is an **optional** layer for OWD themes: **neutral composable names** and repeated **desktop shell** behaviour so Win95, Win11, GNOME-style themes, etc. supply **chrome only** (CSS, icons, layout, i18n)—not duplicated session, routing, or dialog wiring.

This package does **not** ship UI components or filesystem primitives; see **`kit-fs`** / **`kit-explorer`** for explorer UI.

### What lives here

| Area | Purpose |
|------|---------|
| **`useDesktopSession`** | End-of-session flow (e.g. shutdown animation → navigate to the theme’s `/start` route). |
| **`useDesktopShellOptions`** | Read `runtimeConfig` / `appConfig` for `desktop.systemBar` (enabled, position, start button). |
| **`useBlockNonInputContextMenu`** | Disable browser context menu on non-input elements (desktop shell–style). |
| **`createPrimeVueOwdDialogs`** | Implement `OwdDialogProvider` with PrimeVue `useConfirm` (shared by themes that use PrimeVue confirm groups). |

Composables under `runtime/composables/` are **auto-imported** when the Nuxt module loads. `createPrimeVueOwdDialogs` lives under `runtime/dialogs/` and is **imported explicitly** in theme plugins.

### Relationship to `kit-fs` / `kit-explorer`

These packages are **orthogonal**:

- **`kit-theme`** — desktop shell helpers (session, system bar options, context-menu guard, PrimeVue dialog bridge).
- **`kit-fs`** — filesystem explorer **UI primitives** (`KitFs*` components, selectable area).
- **`kit-explorer`** — explorer **behaviour** + headless chrome bases; it **installs `kit-fs`** automatically.

A theme may depend on **`kit-theme`** only, or **`kit-theme`** + **`kit-explorer`** (+ **`module-fs`**) together—there is no automatic dependency between `kit-theme` and `kit-fs`.

### What stays in each theme

Start menu, taskbar, window borders, wallpapers, i18n, assets, and dialog markup/skin (e.g. `<ConfirmDialog />` groups with theme-specific templates/CSS).

## Installation

```bash
pnpm add @owdproject/kit-theme
```

Peers: **`vue`**, **`nuxt`**, **`@owdproject/core`** (match versions with your client workspace).

## Usage

### Theme module (`module.ts`)

Install the Nuxt module so composables are registered:

```ts
await installModule('@owdproject/kit-theme')
```

### Composables (auto-import)

Use in theme components without manual registration:

```ts
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
import { useBlockNonInputContextMenu } from '@owdproject/kit-theme/runtime/composables/useBlockNonInputContextMenu'
```

(Depending on Nuxt auto-import settings, you may omit imports where symbols are globally available.)

### PrimeVue dialog bridge (explicit import)

Wire core’s dialog provider in a **client plugin** after `useConfirm` is available:

```ts
import { createPrimeVueOwdDialogs } from '@owdproject/kit-theme/runtime/dialogs/createPrimeVueOwdDialogs'
```

Themes still mount PrimeVue `<ConfirmDialog />` groups (`delete`, `about`, …) with their own styling.

### Integration notes

- Keep **visual** and **copy** in the theme; keep **reusable shell mechanics** here when they repeat across themes.
- Align **`@owdproject/core`** with the desktop app—this package depends on core dialog types (`OwdDialogProvider`).
- **`defineDesktopConfig`** does not need to list `kit-theme` unless your orchestration expects it as an explicit module entry; **`installModule` from the theme `module.ts`** is the usual pattern.

## License

The module is released under the [MIT License](LICENSE).
