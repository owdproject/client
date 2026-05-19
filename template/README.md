<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Nuxt Desktop</h1>
<h3 align="center">
  Powered by <code>@owdproject/core</code> — browser desktop experiences on Nuxt.
</h3>

## Overview

This project was scaffolded with **Nuxt Desktop** (Open Web Desktop). It is a Nuxt app plus `owd.config.ts` — no Nx required for day-to-day dev (`pnpm run dev` runs `nuxt dev` in `desktop/`).

[Demo](https://atproto-os.pages.dev/) · [Community](https://discord.gg/zPNaN2HAaA) · [Documentation](https://owdproject.org/)

## Features

- Fully extendable through apps, modules and themes
- Bundled with popular Vue.js libraries like Pinia and VueUse
- Designed to make the most of the Nuxt.js ecosystem
- Styled with PrimeVue and Tailwind for a consistent UI
- Fully localizable with nuxt-i18n support

## Getting started

Bootstrap a new project:

```bash
npm create owd
# or: desktop init my-desktop
# or: npx nuxi@latest module add @owdproject/core
```

Setup runs `pnpm install` and opens the **control panel** (`desktop ui`) when your terminal is interactive.

```bash
cd owd-client

pnpm desktop ui     # catalog, install apps/themes (User mode = npm)
pnpm run dev        # Nuxt dev server only

pnpm run generate   # production build
```

Default install mode is **User (npm)** — configured in `.owd/settings.json`.

## Extend your desktop

Thanks to Tailwind and PrimeVue, you can create custom themes from scratch and ensure a consistent look across all apps. Each theme defines its own style, making your desktop both cohesive and uniquely yours.

[Applications](https://github.com/topics/owd-apps) · [Modules](https://github.com/topics/owd-modules) · [Themes](https://github.com/topics/owd-themes)

### 🧩 Install an app

Discover apps by searching the [owd-apps](https://github.com/topics/owd-apps) tag on GitHub.

For example, to add the To-do app from the control panel press `s` after selecting packages, or:

```bash
pnpm desktop add @owdproject/app-todo
```

### 🧩 Install a module

Discover modules by searching the [owd-modules](https://github.com/topics/owd-modules) tag on GitHub.

For example, to add Pinia persistence backed by IndexedDB (`idb-keyval`):

```bash
pnpm desktop add @owdproject/module-persistence
```

### 🖥️ Install a theme

Themes are full desktop environments that style all UI components independently, using [PrimeVue](https://primevue.org/).  
Each theme provides a unique look and feel while maintaining consistent functionality across applications.

Discover themes by searching the [owd-themes](https://github.com/topics/owd-themes) tag on GitHub.

```bash
pnpm desktop add @owdproject/theme-gnome
```

## Sponsors

Be the first to support this project and help us keep it growing! [Sponsor the project](https://github.com/sponsors/owdproject)

## License

Open Web Desktop is released under the [MIT License](LICENSE).
