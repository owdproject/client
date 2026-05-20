<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Nova Theme</h1>
<h3 align="center">
  Modern desktop theme for Open Web Desktop (GitHub Sponsors).
</h3>

## Overview

Nova is the **reference OWD shell**: a compact top bar with **Start** (search + app list), a **system tray** (workspaces, battery/volume/network status, clock, quick settings), a bottom dock for running apps, and a Material-style PrimeVue preset. It is the default theme in many module playgrounds (`app-about`, `module-docs`, …). When `@owdproject/module-fs` is enabled, Nova also ships an integrated file explorer on `kit-explorer`.

## Installation

```bash
pnpm desktop add @owdproject/theme-nova
```

## Usage

Shell options are merged into `appConfig.desktop` from the theme module defaults and optional overrides in `desktop.config.ts`:

```ts
import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  systemBar: {
    enabled: true,
    position: 'top',
    startButton: true,
  },
  dockBar: {
    enabled: true,
    position: 'bottom',
  },
})
```

| Option | Description |
|--------|-------------|
| `systemBar.enabled` | Show the Nova top bar |
| `systemBar.startButton` | Show **Start** and the app launcher |
| `systemBar.launcherPresentation` | `responsive` (default): compact panel on desktop, full-screen launcher with search on narrow viewports; `compact` or `fullscreen` to force one mode |
| `systemBar.position` | `top` (default) or `bottom` |
| `dockBar.enabled` | Show the bottom dock for running applications |
| `dockBar.position` | `bottom` (default) |

Use **Start** to search and launch registered desktop apps. The menu uses a **flat dark panel** with inset search, grouped categories (when not filtering), and squircle app tiles. The **top-right tray** shows workspace overview, status icons, date/time, and **quick settings** (user session, volume, battery). On desktop you get a compact panel under the button; on mobile (or with `launcherPresentation: 'fullscreen'`) you get a full-screen launcher with a large search field and touch-friendly app tiles. The dock **menu** button (grip icon) opens the same full-screen launcher; other dock buttons switch to running apps.

## Playground

```bash
cd apps/app-about/playground
pnpm install
pnpm run dev
```

## License

This theme is released under the **OWD-1.0-reserved** license (GitHub Sponsors).
