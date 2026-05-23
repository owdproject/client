<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Open Web Desktop</h1>
<h3 align="center">
  A modular framework for building web-based desktop experiences.
</h3>

## Overview

Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences. It's built with Vue.js & TypeScript, and it leverages the extensible Nuxt.js architecture.

[Demo](https://atproto-os.pages.dev/) · [Community](https://discord.gg/zPNaN2HAaA) · [Documentation](https://owdproject.org/)

## Features

- Fully extendable through apps, modules and themes
- Bundled with popular Vue.js libraries like Pinia and VueUse
- Designed to make the most of the Nuxt.js ecosystem
- Styled with PrimeVue and Tailwind for a consistent UI
- Fully localizable with nuxt-i18n support

## Repository layout

- **`desktop/`** — monorepo dev desktop (workspace apps, modules, themes). Use `pnpm run dev` from the repo root.
- **`template/`** — scaffold copied by `npm create owd` / `desktop init`. **Do not edit by hand**; regenerate with `pnpm desktop template` (or `pnpm template:sync`) after changing the starter desktop or publishing `@owdproject/*` packages. Blueprint sources live in `packages/core/template-blueprint/`.

## Getting started

Bootstrap a new project by running:

```bash
npm create owd
```

Once the process is done, you can start to develop:

```bash
cd owd-client

# Run the dev server with hot-reload
pnpm install
pnpm run dev

# Build for production
pnpm run generate
```

## Extend your desktop

Thanks to Tailwind and PrimeVue, you can create custom themes from scratch and ensure a consistent look across all apps. Each theme defines its own style, making your desktop both cohesive and uniquely yours.

**Developing apps/themes in isolation:** publishable packages use a `playground/` mini-desktop and `nuxt-module-build` — see [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md) (examples: [app-about](https://owdproject.github.io/app-about/), [app-wasmboy](https://owdproject.github.io/app-wasmboy/)).

[Applications](https://github.com/topics/owd-apps) · [Modules](https://github.com/topics/owd-modules) · [Themes](https://github.com/topics/owd-themes)

### 🧩 Install an app

Discover apps by searching the [owd-apps](https://github.com/topics/owd-apps) tag on GitHub.

For example, to add the To-do app:

```bash
desktop add app-todo
# from npm only:
desktop add app-todo --npm
```

This installs (or clones) the package and registers it in `desktop/desktop.config.ts`. The `owd` command is a deprecated alias for `desktop`.

### 🧩 Install a module

Discover modules by searching the [owd-modules](https://github.com/topics/owd-modules) tag on GitHub.

For example, to add Pinia persistence backed by IndexedDB (`idb-keyval`):

```bash
desktop add module-persistence
# or your fork:
desktop add module-persistence --from your-github-user
```

### 🖥️ Install a theme

Themes are full desktop environments that style all UI components independently, using [PrimeVue](https://primevue.org/).  
Each theme provides a unique look and feel while maintaining consistent functionality across applications.

Discover themes by searching the [owd-themes](https://github.com/topics/owd-themes) tag on GitHub.

```bash
desktop add theme-gnome
```

## License

Open Web Desktop is released under the [MIT License](LICENSE).
