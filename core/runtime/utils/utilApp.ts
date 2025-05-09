import type {Nuxt} from "@nuxt/schema";

export function normalizeApplicationConfig(config: ApplicationConfig): ApplicationConfig {
    const normalizedEntries: Record<string, ApplicationEntry> = {}

    for (const [key, entry] of Object.entries(config.entries)) {
        normalizedEntries[key] = {
            ...entry,
            title: entry.title ?? config.title,
            icon: entry.icon ?? config.icon,
            category: entry.category ?? config.category,
            visibility: entry.visibility ?? 'primary',
        }
    }

    return {
        ...config,
        version: config.version ?? 'unknown',
        description: config.description ?? '',
        category: config.category ?? 'other',
        entries: normalizedEntries,
    }
}

export function registerTailwindPath(nuxt: Nuxt, path: string) {
    nuxt.options.runtimeConfig = nuxt.options.runtimeConfig || {}
    nuxt.options.runtimeConfig.owd = nuxt.options.runtimeConfig.owd || {}
    nuxt.options.runtimeConfig.owd.tailwindPaths = nuxt.options.runtimeConfig.owd.tailwindPaths || []

    if (!nuxt.options.runtimeConfig.owd.tailwindPaths.includes(path)) {
        nuxt.options.runtimeConfig.owd.tailwindPaths.push(path)
    }
}