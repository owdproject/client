<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Open Web Desktop</h1>
<h3 align="center">
  A modular framework for building web-based desktop experiences.
</h3>

## Overview

Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences. It's built with Vue.js & TypeScript, and it leverages the extensible Nuxt.js architecture.

[Demo](https://atproto-os.pages.dev/) · [Community](https://discord.gg/zPNaN2HAaA)

## Features

- Open-source web desktop environment built with Nuxt.js
- Fully extendable through themes, apps, and modules
- Bundled with popular Vue.js libraries like Pinia and VueUse
- Designed to make the most of the Nuxt.js ecosystem
- Styled with PrimeVue and Tailwind for a consistent UI
- Fully localizable with nuxt-i18n support

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

[Documentation](https://owdproject.org/) · [Applications](https://github.com/topics/owd-apps) · [Modules](https://github.com/topics/owd-modules) · [Themes](https://github.com/topics/owd-themes)

### 🧩 Install an application

You can discover new apps by searching for the [owd-apps](https://github.com/topics/owd-apps) tag on GitHub.

For example, to install the To-do app:

```bash
nx run desktop:install-app --name=@owdproject/app-todo
```

This will install the package and automatically register it in your desktop configuration.

### 🧩 Install a module

You can discover new modules by searching for the [owd-modules](https://github.com/topics/owd-modules) tag on GitHub.

For example, to install the session persistence module:

```bash
nx run desktop:install-app --name=@owdproject/module-pinia-localforage
```

### 🖥️ Themes

Themes are full desktop environments that style all UI components independently using [PrimeVue](https://primevue.org/).  
Each theme provides a unique look and feel while maintaining consistent functionality across all applications.

You can discover new themes by searching for the [owd-themes](https://github.com/topics/owd-themes) tag on GitHub.

```bash
nx run desktop:install-theme --name=@owdproject/theme-gnome
```

## Sponsors

Be the first to support this project and help us keep it growing! [Sponsor the project](https://github.com/sponsors/owdproject)

## License

Open Web Desktop is released under the [MIT License](LICENSE).
