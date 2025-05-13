import {useApplicationManager} from './useApplicationManager'
import {computed} from "@vue/reactivity"

type SortBy = 'title' | 'category' | ((a: ApplicationEntryWithInherited, b: ApplicationEntryWithInherited) => number)
type Visibility = 'primary' | 'all' | ((entry: ApplicationEntryWithInherited) => boolean)

export function useAppEntries() {
    const applicationManager = useApplicationManager()

    const sortedAppEntries = function(
        sortBy: SortBy = 'title',
        visibility: Visibility = 'primary'
    ): Ref<ApplicationEntryWithInherited[]> {
        return computed(() => {
            const currentEntries = [...applicationManager.appsEntries]

            // filtering
            const filtered = typeof visibility === 'function'
                ? currentEntries.filter(visibility)
                : visibility === 'primary'
                    ? currentEntries.filter(e => e.visibility !== 'secondary')
                    : currentEntries

            // sorting
            const sorted = typeof sortBy === 'function'
                ? filtered.sort(sortBy)
                : sortBy === 'title'
                    ? filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                    : filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''))

            return sorted
        })
    }

    return { sortedAppEntries }
}
