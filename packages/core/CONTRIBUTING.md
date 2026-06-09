# Contributing to Open Web Desktop

## Monorepo vs module

- **This repo** (`owdproject/client`): Nx, apps, themes, team demos.
- **Published module**: `@owdproject/core` in `packages/core` — target listing: [nuxt.com/modules/desktop](https://nuxt.com/modules/desktop).

## Local development

```bash
pnpm install
pnpm run prepare:modules
pnpm run dev              # full desktop (Nx) — use this to develop @owdproject/core
cd packages/core && pnpm run dev:prepare   # stub dist/ only (no separate playground)
pnpm desktop              # control panel
```

### App/theme module playground

To develop a single `@owdproject/app-*` or `@owdproject/theme-*` in isolation (and ship a GitHub Pages demo):

```bash
cd apps/app-about   # or apps/app-wasmboy, themes/theme-win95, …
pnpm run dev:prepare
pnpm run dev
pnpm run dev:generate   # static → playground/.output/public
pnpm run validate       # desktop validate . — playbook layout checks
```

Full checklist and file templates: [`PLAYGROUND.md`](./PLAYGROUND.md).

**Validate all monorepo modules from client root:** `pnpm run validate:modules`

**Validator tests:** `cd packages/core && pnpm exec vitest run test/validateModule.test.js`

## Dev install mode (contributors)

In `pnpm desktop`:

1. Press **`m`** for the menu, or **`s`** start / **`x`** stop / **`R`** reboot the dev server.
2. Press **`d`** → install mode info (USER/DEV); **Enter** in the panel toggles mode.
3. Press **`g`** → set GitHub username for forks.
4. **Modules** tab (default): discover community packages — **`[new]`** badge, **`o`** to sort (updated / name / stars / installed), **`r`** refresh from GitHub.
5. **`t`** changes theme (one line in the catalog header); **`1`** / **`2`** switch Apps / Modules.
6. Select packages, **`w`** to save — Nuxt restarts on its own when `desktop.config.ts` changes (same ℹ as `nuxt.config.ts` in the dev log). Use **`R`** only if the server is stuck.

Or CLI: `desktop add app-todo --dev --from your-user`

## List on nuxt.com/modules

1. Read [`docs/nuxt-modules/`](../docs/nuxt-modules/README.md).
2. Open [module request](https://github.com/nuxt/modules/issues/new?template=module_request.yml) or PR with `desktop.yml`.
3. Roadmap: [`docs/NUXT_DESKTOP_ECOSYSTEM.md`](../docs/NUXT_DESKTOP_ECOSYSTEM.md).
