# @owdproject/module-docs

Installable documentation for [Open Web Desktop](https://owdproject.org) — [Nuxt Content](https://content.nuxt.com) v3 with an OWD-compatible layout (same stack as your desktop: PrimeVue + Tailwind). Served at `/docs` inside your app. The public site [owdproject.org](https://owdproject.org) may use [Docus](https://docus.dev) separately; embedding full Docus conflicts with the desktop Tailwind/PrimeVue setup.

## Installation

```bash
desktop add module-docs
# or
npm install @owdproject/module-docs
```

Add to `desktop.config.ts` (before modules that extend docs, e.g. `module-fs`):

```ts
export default defineDesktopConfig({
  modules: ['@owdproject/module-docs', '@owdproject/module-fs'],
  docs: {
    basePath: '/docs',
    title: 'Open Web Desktop',
    sources: [{ cwd: './content', include: 'docs/**' }],
  },
})
```

## Extend documentation from another module

```ts
import { registerOwdDocsSource } from '@owdproject/module-docs'

registerOwdDocsSource(nuxt, {
  id: 'module-fs',
  cwd: resolve('./content'),
  include: '**/*.md',
  prefix: '/docs/modules/filesystem',
})
```

## Deprecated alias

`@owdproject/docs` re-exports this package for backward compatibility.

## License

MIT
