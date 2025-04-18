import {useApplicationManager} from './useApplicationManager'
import {computed} from "@vue/reactivity"

export function useAppEntries() {
    const applicationManager = useApplicationManager()

    const sortedAppEntries = function(
        sortBy: 'title' | 'category',
        visibility: 'primary' | 'all' = 'primary'
    ): Ref<ApplicationEntryWithInherited[]> {
        return computed(() => {
            const currentEntries = [...applicationManager.appsEntries]

            // filter by
            const filtered = visibility === 'primary'
                ? currentEntries.filter(e => e.visibility !== 'secondary')
                : currentEntries

            // order by
            if (sortBy === 'title') {
                filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
            } else if (sortBy === 'category') {
                filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
            }

            return filtered
        })
    }

    return { sortedAppEntries }
}
