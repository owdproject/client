# Contributing to Open Web Desktop

## Monorepo vs module

- **This repo** (`owdproject/client`): Nx, apps, themes, team demos.
- **Published module**: `@owdproject/core` in `packages/core` — target listing: [nuxt.com/modules/desktop](https://nuxt.com/modules/desktop).

## Local development

```bash
pnpm install
pnpm run prepare:modules
pnpm run dev              # full desktop (Nx)
cd packages/core && pnpm run dev   # module playground only
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

Full checklist, file templates, CI/Pages workflow: [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](../../docs/agents/OWD_APP_MODULE_PLAYGROUND.md).

**Validate all monorepo modules from client root:** `pnpm run validate:modules`

**Validator tests:** `cd packages/core && pnpm exec vitest run test/validateModule.test.js`

## Dev install mode (contributors)

In `pnpm desktop`:

1. Press **`m`** for the menu, or **`s`** start / **`x`** stop / **`R`** reboot the dev server.
2. Press **`d`** → badge **`[DEV]`** (clone into `apps/`, `packages/`, `themes/`).
3. Press **`g`** → set GitHub username for forks.
4. Select packages, **`w`** to save.

Or CLI: `desktop add app-todo --dev --from your-user`

## List on nuxt.com/modules

1. Read [`docs/nuxt-modules/`](../docs/nuxt-modules/README.md).
2. Open [module request](https://github.com/nuxt/modules/issues/new?template=module_request.yml) or PR with `desktop.yml`.
3. Roadmap: [`docs/NUXT_DESKTOP_ECOSYSTEM.md`](../docs/NUXT_DESKTOP_ECOSYSTEM.md).
