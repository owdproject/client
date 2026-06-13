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
- Styling-agnostic (Tailwind, PrimeVue, and other styling frameworks can be used optionally)
- Fully localizable with nuxt-i18n support
- Dynamic Terminal User Interface (TUI) for managing the workspace, packages, and dev server

## Repository layout

- **`desktop/`** — monorepo dev desktop (workspace apps, modules, themes). Use `pnpm run dev` from the repo root.
- **`template/`** — scaffold copied by `npm create owd` / `pnpm desktop init`. **Do not edit by hand**; regenerate with `pnpm desktop template` (or `pnpm template:sync`) after changing the starter desktop or publishing `@owdproject/*` packages. Blueprint sources live in `packages/core/template-blueprint/`.

## Getting started

Bootstrap a new project by running:

```bash
npm create owd
```

Once the process is done, you can start the control panel (TUI) to manage your workspace and dev server:

```bash
cd owd-client
pnpm install
pnpm desktop
```

Within the TUI, press `d` to start/stop the dev server, toggle packages, and inspect logs. Alternatively, you can run the dev server or production build directly:

```bash
# Run the dev server directly
pnpm run dev

# Build for production
pnpm run generate
```

## Extend your desktop

You can create custom apps, modules, and themes to extend your desktop. Themes can define their own styling (e.g. using PrimeVue, Tailwind, vanilla CSS, etc.), making your desktop environment cohesive and uniquely yours.

**Developing apps/themes in isolation:** publishable packages use a `playground/` mini-desktop and `nuxt-module-build` — see [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md) (examples: [app-about](https://owdproject.github.io/app-about/), [app-wasmboy](https://owdproject.github.io/app-wasmboy/)).

[Applications](https://github.com/topics/owd-apps) · [Modules](https://github.com/topics/owd-modules) · [Themes](https://github.com/topics/owd-themes)

### 🧩 Install an app

Discover apps by searching the [owd-apps](https://github.com/topics/owd-apps) tag on GitHub.

For example, to add the To-do app:

```bash
pnpm desktop add app-todo
# from npm only:
pnpm desktop add app-todo --npm
```

This installs (or clones) the package and registers it in `desktop/desktop.config.ts`.

### 🧩 Install a module

Discover modules by searching the [owd-modules](https://github.com/topics/owd-modules) tag on GitHub.

For example, to add Pinia persistence backed by IndexedDB (`idb-keyval`):

```bash
pnpm desktop add module-persistence
# or your fork:
pnpm desktop add module-persistence --from your-github-user
```

### 🖥️ Install a theme

Discover themes by searching the [owd-themes](https://github.com/topics/owd-themes) tag on GitHub.

```bash
pnpm desktop add theme-gnome
```

## License

Open Web Desktop is released under the [MIT License](LICENSE).
