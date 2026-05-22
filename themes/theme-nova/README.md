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
  workspaces: {
    enabled: true,
  },
})
```

| Option | Description |
|--------|-------------|
| `systemBar.enabled` | Show the Nova top bar |
| `systemBar.startButton` | Show **Start** and the unified app launcher |
| `systemBar.position` | `top` (default) or `bottom` |
| `dockBar.enabled` | Show the bottom dock for running applications |
| `dockBar.position` | `bottom` (default) |
| `workspaces.enabled` | Virtual desktops: tray overview button, per-desktop window stacks, overview grid with drag-between-desktops (core `useWorkspaceOverview`), bottom switcher to add/switch desktops |

Use **Start** (or the dock **menu** grip button) to open the **Apps** launcher: a single overlay with a blurred/dimmed backdrop over the whole desktop, centered panel on wide viewports, and edge-to-edge panel on narrow screens. Search filters the grid; without a query, apps are grouped by category. Launching an app, pressing **Esc**, or clicking the backdrop closes the launcher. The **top-right tray** shows **workspaces** (overview grid: switch desktop, add desktop, drag windows between desktops), status icons, date/time, an **account** button (guest session + volume + battery), and an **accent** button to cycle shell colors. On narrow viewports, workspace/battery/volume/wifi collapse into a **More** (⋯) menu; clock, account, and accent stay visible.

## Playground

```bash
cd apps/app-about/playground
pnpm install
pnpm run dev
```

## License

This theme is released under the **OWD-1.0-reserved** license (GitHub Sponsors).
