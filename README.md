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
- Bundled with popular libraries like Pinia and VueUse
- Designed to make the most of the Nuxt.js ecosystem
- Can support any UI kit as PrimeVue, Vuetify and Quasar
- Fully localizable with nuxt-i18n support

## Repository layout

- **`desktop/`** — dev desktop (workspace apps, modules, themes). Use `pnpm run dev` from the repo root.
- **`template/`** — scaffold copied by `npm create owd` / `pnpm desktop init`. <br /><br />**Do not edit by hand**; regenerate with `pnpm desktop template` (or `pnpm template:sync`) after changing the starter desktop or publishing `@owdproject/*` packages. Blueprint sources live in `packages/core/template-blueprint/`.

## Getting Started

We recommend cloning the monorepo workspace to develop and build with Open Web Desktop.

> [!TIP]
> **Feeling adventurous?**
> You can bootstrap a standalone client project from the latest template using our installer:
> ```bash
> npm create owd
> ```
> *Note: This installation method is currently a Work in Progress (WIP). Once the framework reaches a fully stable release, bootstrapping will become the recommended standard.*

### 1. Clone the repository

Clone the monorepo to your machine:

```bash
git clone https://github.com/owdproject/client.git
cd client
```

### 2. Install dependencies

Install the project dependencies using `pnpm`:

```bash
pnpm install
```

### 3. Run the environment

Run the dev server directly:
```bash
pnpm run dev
```

Or start the control panel (TUI) to manage packages and logs:
```bash
pnpm run desktop
```
*(Press `d` in the control panel to toggle the dev server).*

## Ecosystem & Extensibility

Open Web Desktop is designed to scale via modular extension packages. You can customize your workspace using three dedicated package types:

### Package Categories

| Type | Description | Directory | Discovery Tag |
| :--- | :--- | :--- | :--- |
| **Apps** | User-facing desktop application programs | `apps/` | [owd-apps](https://github.com/topics/owd-apps) |
| **Modules** | Nuxt/Vue plugins and backend integrations | `packages/` | [owd-modules](https://github.com/topics/owd-modules) |
| **Themes** | Window manager styles and workspace skins | `themes/` | [owd-themes](https://github.com/topics/owd-themes) |

---

### Managing Packages

The OWD CLI makes it easy to install, import, and configure packages automatically.

#### Installing an Application
To add a new application (e.g., a Todo app):
```bash
pnpm desktop add app-todo
```
*This command clones or copies the package into `apps/app-todo` and automatically registers it in the local `desktop/desktop.config.ts` config.*

#### Installing a Module
To add a module (e.g., Pinia state persistence):
```bash
pnpm desktop add module-persistence
```

#### Installing a Theme
To add a theme (e.g., a GNOME look-and-feel package):
```bash
pnpm desktop add theme-gnome
```

### Advanced CLI Commands

Install packages directly from npm or from custom repository forks:

```bash
# Install directly from the npm registry
pnpm desktop add app-todo --npm

# Clone from a specific GitHub user fork
pnpm desktop add module-persistence --from github-username
```

### Isolated Package Development

For developers building reusable packages (e.g., publishable apps or themes in isolation), OWD supports playground builds using `nuxt-module-build`. 

- Learn more about the playground setup in [docs/agents/OWD_APP_MODULE_PLAYGROUND.md](docs/agents/OWD_APP_MODULE_PLAYGROUND.md).
- Reference examples: [app-about](https://owdproject.github.io/app-about/) and [app-wasmboy](https://owdproject.github.io/app-wasmboy/).

## CLI Reference

To view all available commands and options for the OWD CLI, run:

```bash
pnpm desktop --help
```

<details>
<summary><b>View complete CLI Help Menu</b></summary>

```text
desktop — add apps, modules, and themes to your Open Web Desktop

USAGE
  desktop                 Open the control panel (interactive TUI)
  desktop dev [--playground]  Start dev server (auto-detects module playground)

CONTROL PANEL (TUI)
  m                       Open command menu (all actions)
  s                       Start the Nuxt dev server
  x                       Stop the Nuxt dev server
  R                       Reboot the Nuxt dev server (stop + start)
  w                       Save catalog/theme changes to desktop.config.ts
  1 / 2 / 3               Apps / Modules / Themes catalog tabs
  o / O                   Cycle sort (o) or open sort picker (O)
  i                       Open in-app docs (when module-docs is installed)
  g                       Settings (GitHub user, SSH, trusted orgs)
  r                       Refresh package list from GitHub (detects new modules)
  b                       Run pnpm run generate
  q / Esc                 Quit
  desktop init [dir]      Create a new OWD project (then opens the control panel)
  desktop add <package> [options]
  desktop add <kind> <name> [options]
  desktop validate [path...]  Check Nuxt module + playground layout
  desktop template [--dry-run] [--check]  Regenerate client/template/ (maintainers)

TEMPLATE (monorepo maintainers)
  desktop template              Write template/ from blueprint + desktop/ + latest npm versions
  desktop template --dry-run    Show planned @owdproject/* and starter versions
  desktop template --check      Fail if committed template/ differs (CI)

VALIDATE
  desktop validate            Validate cwd package, or all apps/themes/modules at repo root
  desktop validate .          Validate explicit package directory
  desktop validate apps       Validate every @owdproject/* module under apps/
  --json                      Machine-readable output
  --strict                    Treat warnings as failures
  --smoke                     Run dev:prepare + nuxt build playground (slow, CI)

INSTALL SOURCES (control panel or CLI)
  npm                   registry (default for desktop add)
  --dev                 clone github.com/owdproject/<package>
  --from <user>         clone from GitHub user or full git URL (SSH supported)

EXAMPLES
  pnpm desktop            # control panel
  pnpm desktop dev        # monorepo desktop (from repo root)
  cd apps/app-about && pnpm desktop dev   # app-about playground
  pnpm desktop dev --playground           # force playground when cwd is in a module
  desktop init my-desktop # scaffold + pnpm install + control panel
  desktop add app-todo --npm
  desktop add app-todo --dev
  desktop add module-persistence --from dxlliv

KINDS (optional — inferred from the package name)
  app       app-*     → apps/
  module    module-*  → packages/  (kit-* and *-template are not listed in the control panel)
  theme     theme-*   → themes/

OPTIONS
  --playground      Start the module playground dev server (when cwd is inside an @owdproject/* package with playground/)
  --from <source>   Git source (user, user/repo, or URL)
  --branch <name>   Git branch to clone
  --npm             Install from npm (default when --from is omitted)
  --dev, --workspace  Clone from github.com/owdproject/<package>
  --protocol https|ssh  With --from <user>, use HTTPS (default) or SSH clone URL
  --dry-run         Print the plan without changing anything
  -h, --help        Show this help

--from <source>
  (omit)          npm registry (default)
  npm             npm registry
  owdproject      Clone official repo (monorepo only)
  <github-user>   Clone github.com/<user>/<package> (your fork)
  <user>/<repo>   Explicit GitHub repo
  <git-url>       Full clone URL

LEGACY (still supported)
  desktop install-app @owdproject/app-todo
  → prefer: desktop add app-todo
```

</details>

## License

Open Web Desktop is released under the [MIT License](LICENSE).
