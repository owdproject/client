<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Open Web Desktop</h1>
<h3 align="center">
  A modular framework for building web-based desktop experiences.
</h3>

## Overview

Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences. It's built with Vue.js & TypeScript, and it leverages the extensible Nuxt.js architecture.

[Demo](https://atproto-os.pages.dev/) · [Documentation](https://owdproject.org/)

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

Open Web Desktop can be extended with themes, modules and applications.

### Install an application

You can install a new [application](https://github.com/topics/owd-apps) with:

```bash
pnpm install @owdproject/app-todo
```

Then, define it in the desktop configuration:

```typescript
// desktop/owd.config.ts
export default defineDesktopConfig({
    theme: "@owdproject/theme-win95",
    apps: [
        "@owdproject/app-about",
        "@owdproject/app-todo", // define here the app you just installed
    ],
    modules: []
})
```

### Install a module

You can install a new [module](https://github.com/topics/owd-modules) with:

```bash
pnpm install @owdproject/module-pinia-localforage
```

Then, define it in the desktop configuration:

```typescript
// desktop/owd.config.ts
export default defineDesktopConfig({
    theme: "@owdproject/theme-win95",
    apps: [
        "@owdproject/app-about",
        "@owdproject/app-todo",
    ],
    modules: [
        "@owdproject/module-pinia-localforage", // define here the module you just installed
    ]
})
```

## Themes
You can install a new [theme](https://github.com/topics/owd-themes) in the same way.

```bash
pnpm install @owdproject/theme-gnome
```

Define the theme in `owd.config.ts`:

```typescript
// desktop/owd.config.ts
export default defineDesktopConfig({
    theme: "@owdproject/theme-gnome", // define here the theme you just installed
    apps: [
        "@owdproject/app-about",
        "@owdproject/app-todo",
    ],
    modules: [
        "@owdproject/module-pinia-localforage"
    ]
})
```

## Sponsors

Make this project sustainable, your support is crucial to keep it moving forward.

## License

Open Web Desktop is released under the [MIT License](LICENSE).
