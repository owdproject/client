<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Nova Theme</h1>
<h3 align="center">
  Modern desktop theme for Open Web Desktop (GitHub Sponsors).
</h3>

## Overview

Nova is a modern OWD theme with a top system bar, bottom dock, and a Material-style PrimeVue preset. When `@owdproject/module-fs` is enabled, it also ships an integrated file explorer built on `kit-explorer`.

## Installation

```bash
pnpm desktop add @owdproject/theme-nova
```

## Usage

#### Available configuration

You could set this configuration in `/desktop/owd.config.ts`:

```js
export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  desktop: {
    systemBar: {
      enabled: true,
      position: 'top',
      startButton: false,
    },
    dockBar: {
      enabled: true,
      position: 'bottom',
    },
  },
})
```

## License

This theme is released under the **OWD-1.0-reserved** license (GitHub Sponsors).
