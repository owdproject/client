<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Win11 Theme</h1>
<h3 align="center">
  Windows 11 Theme for Open Web Desktop.
</h3>

## Overview

This theme for Open Web Desktop recreates a Windows 11-inspired desktop experience.

## Installation

```bash
pnpm desktop add @owdproject/theme-win11
```

## Usage

#### Available configuration

You could set this configuration in `/desktop/owd.config.ts`:

```js
export default defineDesktopConfig({
  theme: '@owdproject/theme-win11',
  desktop: {
    systemBar: {
      enabled: false,
      startButton: false,
      position: 'bottom'
    },
    workspaces: {
      enabled: true
    },
    explorer: {
      quickAccess: [],
      specialFolders: []
    },
  }
})
```

## License

The application is released under the [MIT License](LICENSE).
