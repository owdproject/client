import {useApplicationManager} from './useApplicationManager'
import {computed} from "@vue/reactivity"

export function useAppEntries() {
    const applicationManager = useApplicationManager()

    const sortedAppEntries = function(sortBy: 'title'): Ref<ApplicationEntryWithInherited[]> {
        return computed(() => {
            const currentEntries = [...applicationManager.appsEntries]

            if (sortBy === 'title') {
                currentEntries.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
            } else if (sortBy === 'category') {
                currentEntries.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
            }
            return currentEntries
        })
    }

    return { sortedAppEntries }
}