<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Kit Explorer</h1>
<h3 align="center">
  Explorer behavior and UI patterns for Open Web Desktop themes.
</h3>

<br />

## Overview

`@owdproject/kit-explorer` provides shared explorer behavior and headless components for themes, including:

- tabs management
- breadcrumb/address bar base
- chrome band base
- view mode switch base

### Relationship to `kit-fs`

At runtime this module **automatically registers** `@owdproject/kit-fs` (filesystem UI primitives: `KitFs*` components, selectable area, composables). You normally **do not** list `kit-fs` again under `defineDesktopConfig({ modules })` when `kit-explorer` is already included—unless you rely on `kit-fs` **without** `kit-explorer` (see below).

- **`kit-fs`** — explorer filesystem UI layer (`KitFs*` building blocks)
- **`kit-explorer`** — shared explorer behavior and headless chrome on top of that layer

## Installation

```bash
pnpm add @owdproject/kit-explorer
```

If your theme or app imports `KitFs*` components or paths under `@owdproject/kit-fs` directly, also add `@owdproject/kit-fs` to **`package.json`** so TypeScript and the bundler can resolve those imports. The Nuxt module for `kit-fs` still loads once via `kit-explorer`.

## Usage

### Desktop config (`owd.config.ts`)

Minimal stack for an explorer-enabled desktop:

```ts
export default defineDesktopConfig({
  modules: [
    '@owdproject/module-fs',
    '@owdproject/kit-explorer',
  ],
})
```

`@owdproject/module-fs` mounts the virtual filesystem; `kit-explorer` pulls in `kit-fs` for you.

### Theme packages (`module.ts`)

Themes that ship their own Explorer UI (instead of only consuming `@owdproject/app-explorer`) usually:

1. Add **`@owdproject/kit-explorer`** and, if templates import primitives directly, **`@owdproject/kit-fs`** to the theme **`package.json`**.
2. In the theme **`module.ts`**, when `@owdproject/module-fs` is enabled, call:

   ```ts
   await installModule('@owdproject/kit-explorer')
   ```

   Do **not** duplicate `installModule('@owdproject/kit-fs')` unless you need `kit-fs` without `kit-explorer`; otherwise `kit-explorer` already installs it.

Visual styling stays in the theme; generic interaction patterns stay in `kit-explorer` / `kit-fs`.

### Integration notes

- Keep theme-specific visuals in the theme package.
- Keep generic explorer interactions in `kit-explorer` (and filesystem UI primitives in `kit-fs`).
- Use `useExplorerTabs()` from `@owdproject/kit-explorer/runtime/composables/useExplorerTabs`.

### Apps that only use `kit-fs`

Example: `@owdproject/app-explorer` registers **`kit-fs` alone** because it does not use `kit-explorer`. In that case list or `installModule('@owdproject/kit-fs')` only.

## License

The module is released under the [MIT License](LICENSE).
