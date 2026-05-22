# Nuxt Desktop — ecosystem and registry

**Nuxt Desktop** is the product name for the Nuxt module shipped as [`@owdproject/core`](../packages/core). **Open Web Desktop (OWD)** is the project and npm org for themes, apps, and kits.

## Layers

| Layer | Package / tool | Role |
|-------|----------------|------|
| Nuxt module | `@owdproject/core` | Shell, windows, `desktop.config.ts`, batteries-included stack |
| Future module name | `@nuxtjs/desktop` | Planned after [nuxt-modules](https://github.com/nuxt-modules) onboarding |
| Themes / apps / modules | `@owdproject/theme-*`, `@owdproject/app-*`, `@owdproject/module-*` | Extensions (stay under `@owdproject`) |
| CLI | `desktop` bin | `desktop`, `desktop dev`, `desktop init`, `desktop add` |
| Monorepo | `owdproject/client` | Team development (Nx, apps, themes) — not required for end users |
| Scaffold | `npm create owd` / `create-owd` | New projects from `template/` |

## nuxt.com/modules listing

Target slug: **[nuxt.com/modules/desktop](https://nuxt.com/modules/desktop)** (currently available).

1. Ensure README quick start and public npm release are up to date.
2. Copy metadata from [`nuxt-modules/desktop.yml`](./nuxt-modules/desktop.yml).
3. Open a [module request](https://github.com/nuxt/modules/issues/new?template=module_request.yml) or PR on [nuxt/modules](https://github.com/nuxt/modules).

Install after listing:

```bash
npx nuxi@latest module add @owdproject/core
# or
npm create owd
```

## Roadmap: `@nuxtjs/desktop`

1. **Now** — List `@owdproject/core` as **desktop** on nuxt.com/modules; document as Nuxt Desktop.
2. **Stabilize** — Playground in `packages/core`, `nuxt-module-build`, issue triage, semver.
3. **Apply** — [Join nuxt-modules](https://nuxt.com/docs/4.x/guide/modules/ecosystem) (same path as [@nuxtjs/storybook](https://github.com/nuxt-modules/storybook)).
4. **Publish** — `@nuxtjs/desktop` as primary package; deprecate `@owdproject/core` alias over 1–2 majors.
5. **Docs** — Optional `desktop.nuxtjs.org`; registry entry points to `@nuxtjs/desktop`.

API stability: keep `desktop.config.ts`, `defineDesktopConfig`, and `defineDesktopApp` — **Nuxt Desktop** is branding; **owd** remains the config namespace.

## Catalog vs registry

| Source | Purpose |
|--------|---------|
| GitHub topics `owd-apps`, `owd-modules`, `owd-themes` | Discovery in `pnpm desktop` (includes `@owdproject/module-docs`) |
| [nuxt.com/modules](https://nuxt.com/modules) | Official Nuxt module discovery |
| npm `@owdproject/*` | Install packages |

Contributors: improve the **Nuxt Desktop module** in `packages/core`; add themes/apps as separate `@owdproject` packages.

### Module playground & GitHub Pages

Publishable apps/themes use **`nuxt-module-build`**, a local **`playground/`**, and optional **GitHub Pages** (`dev:generate` + `.github/workflows/pages.yml`). See [`agents/OWD_APP_MODULE_PLAYGROUND.md`](./agents/OWD_APP_MODULE_PLAYGROUND.md). Examples: `app-about`, `app-wasmboy`, `theme-win95`.
