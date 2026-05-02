<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">About</h1>
<h3 align="center">
  About App for Open Web Desktop.
</h3>

<br />

## Overview

This app for Open Web Desktop displays the version and other information.

## Installation

```bash
owd install-app @owdproject/app-about
```

## Usage

#### Configuration

```ts
export default defineDesktopConfig({
  apps: [
    '@owdproject/app-about'
  ],
  about: {
    title: 'Open Web Desktop',
    subtitle: 'github.com/owdproject/client',
    href: 'https://github.com/owdproject/client',
    versionText: 'v{owdVersion} on Nuxt {nuxtVersion}',
    icons: [
      {
        title: 'Open Web Desktop',
        name: 'mdi:hexagon-multiple-outline',
        size: 24,
      },
    ]
  }
})
```

#### Commands

```
about
```

## License

The application is released under the [MIT License](LICENSE).
