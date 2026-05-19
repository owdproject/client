export function getSortedCategories(applications: Reactive<IApplicationController[]>) {
    const appCategories = new Set<string>()

    for (const [appId, app] of applications) {
        if (app.config.category && baseCategories.includes(app.config.category)) {
            appCategories.add(app.config.category)
        }
    }

    const categoriesArray = Array.from(appCategories).sort((a, b) => a.localeCompare(b));
    const otherIndex = categoriesArray.indexOf('other')

    if (otherIndex !== -1 && otherIndex !== categoriesArray.length - 1) {
        categoriesArray.splice(otherIndex, 1)
        categoriesArray.push('other')
    }

    return categoriesArray
}