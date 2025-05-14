<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Open Web Desktop</h1>
<h3 align="center">
  A framework for building web-based desktop experiences.
</h3>

## Overview
Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences. It's built with Vue.js & TypeScript, and it leverages the extensible Nuxt.js architecture.

[Check out the demo](https://owdproject.github.io/docs) of the `client` base repository, decked with a couple of modules.

## Features
- Open-source web desktop environment built with Nuxt.js
- Fully extendable through themes, apps, and modules
- Bundled with popular libraries like Pinia, VueUse, Mitt
- Designed to make the most of the Nuxt.js ecosystem
- Styled with PrimeVue and Tailwind for a consistent UI
- Fully localizable with i18n support

## Getting started

When you are ready, bootstrap a new project by running:
```bash
npm create owd
```
Once the process is complete, you can start to develop:
```bash
cd owd-client

# Run the dev server with hot-reload
pnpm install
pnpm run dev

# Build for production
pnpm run generate
```

## Modules
Open Web Desktop projects can be extended with [themes, modules, and applications](https://github.com/topics/owd-modules).

### Install a new app
You can install an application with `pnpm install @owdproject/app-todo`.  
Then, simply define it in the configuration:

```typescript
// owd.config.ts
export default defineDesktopConfig({
    theme: '@owdproject/theme-win95',
    apps: [
        "@owdproject/app-about",
        "@owdproject/app-todo", // define here the app you just installed
    ],
    modules: []
})
```

### Install a new module
You can install a module with `pnpm install @owdproject/module-pinia-localforage`.  
Then, simply define it in the configuration:

```typescript
// owd.config.ts
export default defineDesktopConfig({
    theme: '@owdproject/theme-win95',
    apps: [
        "@owdproject/app-about",
        "@owdproject/app-todo",
    ],
    modules: [
        "@owdproject/module-pinia-localforage"  // define here the module you just installed
    ]
})
```

## Themes
You can install a [new theme](https://github.com/topics/owd-themes) the same way.

```bash
pnpm install @owdproject/theme-gnome
```

Define the theme in `owd.config.ts`:

```typescript
// owd.config.ts
import {defineDesktopConfig} from "@owdproject/core/runtime/utils/utilDesktop"

export default defineDesktopConfig({
    theme: '@owdproject/theme-gnome', // define here the theme you just installed
```

## Sponsoring

Open Web Desktop may become a vast project, the code has been entirely rewritten and is now actively being developed. Your support is crucial to keep it moving forward. If you like to see more, please consider donating.

[Become a sponsor](https://github.com/sponsors/owdproject)

## License

Open Web Desktop is released under the [GNU General Public License v3](LICENSE).
