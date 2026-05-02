# @owdproject/kit-fs

Shared **filesystem explorer UI** building blocks for OWD themes (marquee selection, neutral layout helpers). This package does **not** mount ZenFS or replace [`@owdproject/module-fs`](../module-fs): keep `module-fs` as the Nuxt integration layer for the virtual filesystem.

## Usage

1. Add `@owdproject/module-fs` to `owd.config.ts` `modules` when the desktop needs a VFS.
2. Add `@owdproject/kit-fs` (this package) as a dependency of your theme and `installModule('@owdproject/kit-fs')` so Nuxt registers prefixed components (`KitFs*`).

Themes should call `useOwdDialogs` from `@owdproject/core/runtime/composables/useOwdDialogs` (or inject `OWD_DIALOG_PROVIDER_KEY`) for confirm/alert/prompt instead of hard-coding `window.confirm` or a specific dialog library inside reusable explorer logic. See **Dialog provider** in `owd-docs` (internals).

## Peers

- `vue`, `nuxt`, `@owdproject/core` — align versions with your monorepo workspace.
