# Migrate to @owdproject/core 3.3.2

**Audience:** maintainers and coding agents updating themes, apps, or extension modules.

Full guide (checklists, before/after, pitfalls): **[docs/content/6.setup/5.migrate-packages-3.3.2.md](../../docs/content/6.setup/5.migrate-packages-3.3.2.md)** (published as `/setup/migrate-packages-3.3.2` on the docs site).

## Agent one-liner

Extension/app `module.ts` → `defineDesktopModule` + `types/desktop.d.ts`; theme `module.ts` → `defineDesktopTheme(definition)` + `installModule('@owdproject/kit-primevue')` + `registerThemeTailwindPath` from kit-primevue (see MIGRATION_3.4.md — the second `import.meta.url` argument was removed in 3.4); keep `defineDesktopApp` in `plugin.ts`; read config via `public.desktop.<configKey>` or `useDesktopExtension`; import authoring helpers from `@owdproject/core/kit/*` (e.g. `defineDesktopModule`), not the root barrel.

## Reference packages (monorepo)

| Package | Pattern |
|---------|---------|
| `packages/module-fs` | `defineDesktopModule`, `configKey: 'fs'`, augmentation |
| `apps/app-terminal` | `defineDesktopModule`, `configKey: 'terminal'`, `defineDesktopApp` in plugin |

## Do not

- Whitelist extension keys in core
- Export composables from `index.ts`
- Use `appConfig.terminal` / manual `public.desktop[key] = options` in extension setup
- Reintroduce `splitDesktopUserConfig`
