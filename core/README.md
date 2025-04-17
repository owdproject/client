<p align="center">
  <img width="160" height="160" alt="Motion logo" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Open Web Desktop</h1>
<h3 align="center">
  A framework for building web-based desktop experiences.
</h3>

## Overview
Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences. It's built with TypeScript on top of the Nuxt.js framework.

[Check out the demo](https://owdproject.github.io/docs) of the `client` base repository, decked with essential modules.

## Features
- Open-source web desktop environment built with Nuxt.js
- Fully extendable through themes, apps, and modules
- Bundled with popular libraries like Pinia, VueUse, Mitt
- Designed to make the most of the Nuxt.js ecosystem
- Styled with PrimeVue and Tailwind for a consistent UI
- Fully localizable with i18n support

## Getting started
Required software:

- [Git](https://git-scm.com)
- [Node](https://nodejs.org)

When you are ready, bootstrap a new project by running:
```
npm create owd
```
Once the process is complete, you can start to develop:
```
# Run the dev server with hot-reload
npm run dev

# Build for production
npm run generate
```

## Modules
Open Web Desktop projects can be extended with themes, plugins, and desktop apps.

### Install a new app
You can simply install a new application and define it this way.

```typescript
// owd.config.ts
import AppTodo from 'owd-app-todo/owd.config'

export const owdConfig = {
    theme: ['github:owdproject/theme-win95', { install: true }],

    // apps to import
    apps: [
       './node_modules/owd-app-todo',
    ],

    loader: async () => {
        await defineDesktopApp(AppTodo)
    }
}
```

## Themes
Themes allow you to customize the look and feel of your Open Web Desktop instance.

### Install a new theme
Install a new theme by defining its location in the `theme` property of your configuration file.  
Themes can be loaded from local paths or directly from GitHub repositories.

**1. Using a local theme:**

To use a theme from a local folder, specify the path like this:

```typescript
// owd.config.ts
export const owdConfig = {
    theme: './desktop/themes/owd-theme-win95',
}
```

**2. Using a theme from GitHub:**

To use a theme directly from a GitHub repository, specify it in this format: `github:<username>/<repository>`:

```typescript
// owd.config.ts
export const owdConfig = {
    theme: ['github:owdproject/theme-win95', { install: true }],
}
```

## Contributing

**Any contribution is welcome!** Open Web Desktop is built with Nuxt and follows a modular architecture, making it easy to contribute to the core codebase or create new modules.

### Local Development Setup

If you'd like to contribute, here's how to set up your local development environment:

**Prerequisites:**

- [Git](https://git-scm.com)
- [Node](https://nodejs.org)

**Cloning the Repository:**

To contribute, start by forking the Open Web Desktop client repository on GitHub.

Then, clone your fork using HTTPS or SSH:

```bash
# Clone using HTTPS
git clone https://github.com/<your-username>/owd-client.git

# Clone using SSH
git clone git@github.com:<your-username>/owd-client.git
```

Once you have cloned the repository, navigate to the project folder.  
Install the dependencies, then start the development server:

```bash
cd owd-client

npm install
npm run dev
```

This will launch Open Web Desktop in development mode, allowing you to test your changes and see them reflected in real-time.
The dev server will be available at http://localhost:3000.

## Getting Involved

Open Web Desktop is a vast project. The code has been totally rewritten and is now actively being developed, but your support is what makes it all possible. If you're enjoying it and want to see more, consider donating. Your contribution helps keep the project alive and awesome.

### License

Open Web Desktop is licensed under the [GNU General Public License v3](LICENSE).