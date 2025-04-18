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
