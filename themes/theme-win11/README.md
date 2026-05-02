<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Win11 Theme</h1>
<h3 align="center">
  Windows 11 Theme for Open Web Desktop.
</h3>

## Overview

A modern Windows 11-inspired theme, featuring Fluent Design.

## Installation

```bash
owd install-theme @owdproject/theme-win11
```

## Usage

#### Available configuration

You could set this configuration in `/desktop/owd.config.ts`:

```js
export default defineDesktopConfig({
  theme: '@owdproject/theme-win11',
  desktop: {
    systemBar: {
      enabled: true,
      startButton: true,
      position: 'bottom'
    }
  }
})
```

## License

The application is released under the [MIT License](LICENSE).
