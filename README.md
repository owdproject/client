# Open Web Desktop - Client

<p style="text-align: center;">
    <img src="https://i.imgur.com/TqD0gwI.png" alt="Open Web Desktop" />
</p>

## Overview
Open Web Desktop (OWD) is a framework designed to provide a simple environment for building web-based desktop experiences. It's built with TypeScript and leverages the extensible architecture of Nuxt.js.

[Check out the demo](https://owdproject.github.io/demo) of the `owd-client` base repository, showcasing a few base modules.

## Features
- Open-source web desktop environment built with Nuxt.js
- Fully extendable with themes, apps, and desktop modules
- Decked with popular libs like VueUse, Swiper, Slicksort
- Leverage the entire Nuxt.js ecosystem effortlessly

## Getting started
Required software:

- [Git](https://git-scm.com)
- [Node](https://nodejs.org)

When you are ready, bootstrap a new instance by running:
```
npx create-owd-app <app-name>
```
Once the process is complete, you can start to develop:
```
# Run the dev server with hot-reload
npm run dev

# Build for production
npm run generate
```

## Modules
Open Web Desktop instances can be extended with themes, plugins and applications.
You can find some applications available at [topics/owd-modules](https://github.com/topics/owd-modules).

### Install a new app
You can simply install a new app with `npm install git+https://github.com/owdproject/owd-app-todo.git` or by cloning it into `/modules/apps`, then define the application-id in `/owd.config.ts`.

```typescript
// owd.config.ts
export const owdConfig = {
    theme: 'github:owdproject/owd-theme-gnome',

    // apps to import
    apps: [
        'owd-app-todo'
    ]
}
```

## Themes
Themes allow you to customize the look and feel of your Open Web Desktop instance.
You can find some themes available at [topics/owd-themes](https://github.com/topics/owd-modules).

### Install a new theme
You can install and apply a new theme by defining its location in the `theme` property of your `owd.config.ts` file. Open Web Desktop supports loading themes from local paths or directly from GitHub repositories.

**1. Using a local theme:**

To use a theme located within your project (e.g., in a `themes` directory), specify the path to the theme directory.

For example, if your theme is located in `./themes/owd-theme-win95`:

```typescript
// owd.config.ts
export const owdConfig = {
    theme: './themes/owd-theme-win95',
    
    // ... other OWD configurations
}
```

**2. Using a theme from GitHub:**

To use a theme directly from a GitHub repository, specify the repository URL in the format `github:<username>/<repository>`.

For example, to use the `owd-theme-gnome` theme from the `owdproject` organization on GitHub:

```typescript
// owd.config.ts
export const owdConfig = {
    theme: 'github:owdproject/owd-theme-gnome',
    
    // ... other OWD configurations
}
```

**Key takeaways:**

* Themes are now configured using the `theme` property within your `owd.config.ts` file.
* You can specify themes using either a local path or a GitHub repository URL.

## Contributing

We welcome contributions to Open Web Desktop! This project is built with Nuxt and follows a modular architecture, making it relatively easy to extend and contribute to various parts of the codebase.

### Local Development Setup

If you'd like to contribute, here's how to set up your local development environment:

**Prerequisites:**

Make sure you have the following software installed on your system:

- [Git](https://git-scm.com): For version control.
- [Node.js](https://nodejs.org): JavaScript runtime environment.

**Cloning the Repository:**

You can clone the Open Web Desktop client repository using either HTTPS or SSH:

```bash
# Using HTTPS
git clone [https://github.com/owdproject/owd-client.git](https://github.com/owdproject/owd-client.git)

# Using SSH
git clone git@github.com:owdproject/owd-client.git
```

Installing Dependencies and Starting the Development Server:

Once you have cloned the repository, navigate to the project folder and install the necessary dependencies, then start the development server:

```bash
cd owd-client
npm install
npm run dev
```

This will launch Open Web Desktop in development mode, allowing you to test your changes and see them reflected in real-time.

## Getting Involved

Open Web Desktop is a community-driven project with a codebase that has been recently rewritten and is now under active development. Your support is incredibly valuable in fueling this renewed effort and ensuring its continued growth. If you find Open Web Desktop useful and appreciate the dedication behind this significant update, please consider making a donation. Your contribution directly supports the time and effort invested in maintaining the project, developing new features, and providing community support during this exciting phase.

**Why Support?**

Being an open-source project, Open Web Desktop relies on the generosity of its community to thrive. Your support allows us to:

* **Dedicate focused time to development and bug fixes, ensuring the stability of the codebase.**
* **Explore and implement new features based on community feedback, shaping the future of the project.**
* **Provide timely support and guidance to users as the project evolves.**

**How to Support:**

Every contribution, no matter the size, makes a real difference and helps ensure the long-term health and success of Open Web Desktop. Thank you for considering supporting our work during this crucial time!

### License

Open Web Desktop is licensed under the [MIT License](LICENSE).