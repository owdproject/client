<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Kit FS</h1>
<h3 align="center">
  Filesystem UI kit for Open Web Desktop.
</h3>

<br />

## Overview

`@owdproject/kit-fs` provides reusable filesystem UI primitives (frame, explorer entries, selectable area, chrome components) for OWD apps and themes.

It is designed to work with `@owdproject/module-fs`, which remains the runtime module that mounts and manages the virtual filesystem.

## Installation

```bash
pnpm add @owdproject/kit-fs
```

## Usage

#### Configuration

**With `@owdproject/kit-explorer` (typical for themed explorers)**  
You usually **do not** list `kit-fs` in `defineDesktopConfig`: `kit-explorer` installs this module automatically. Your desktop config looks like:

```ts
export default defineDesktopConfig({
  modules: [
    '@owdproject/module-fs',
    '@owdproject/kit-explorer',
  ],
})
```

Add `@owdproject/kit-fs` to **`package.json`** if your code imports `KitFs*` or `@owdproject/kit-fs/runtime/*` paths directly.

**Standalone `kit-fs` (no `kit-explorer`)**  
Some apps (e.g. a minimal explorer app) register only filesystem UI primitives:

```ts
export default defineDesktopConfig({
  modules: [
    '@owdproject/module-fs',
    '@owdproject/kit-fs',
  ],
})
```

Or from a theme/app **`module.ts`**: `await installModule('@owdproject/kit-fs')`.

#### Integration notes

- Use `@owdproject/module-fs` for filesystem runtime behavior (ZenFS integration).
- Use `@owdproject/kit-fs` for explorer UI building blocks (`KitFs*` components, selectable area).
- **Layers:** `module-fs` → optional `kit-explorer` (which registers `kit-fs`) → theme-specific explorer UI. Declare the packages your sources import in **`package.json`**; register Nuxt modules in **`defineDesktopConfig`** and/or the theme’s **`module.ts`** as needed.

## License

The module is released under the [MIT License](LICENSE).
