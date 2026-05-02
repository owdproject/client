# @owdproject/kit-theme

Thin **optional layer** for OWD themes: neutral composable names and repeated shell behaviour so Win95, Win11, GNOME, etc. each supply only **chrome** (CSS, icons, layout), not the same session / config wiring.

## What lives here

- **`useDesktopSession`** — end-of-session flow (e.g. navigate back to the theme’s powered-off / start route).
- **`useDesktopShellOptions`** — read `runtimeConfig` / `appConfig` for `desktop.systemBar` (enabled, position, start button).

## What stays in each theme

- Start menu, taskbar, window borders, i18n strings, assets, and dialog skin (`createWin95OwdDialogs`, future Fluent/GTK providers).

## Usage

In the theme module:

```ts
await installModule('@owdproject/kit-theme')
```

Then in components / composables:

```ts
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
```

Peers: `vue`, `nuxt`, `@owdproject/core` (align with the client workspace).
