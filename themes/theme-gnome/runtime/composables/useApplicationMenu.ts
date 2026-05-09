import { ref, computed } from 'vue'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationEntries } from '@owdproject/core/runtime/composables/useApplicationEntries'
import { getSortedCategories } from '../utils/utilApplications'

const enabled = ref(false)
const categoryActive = ref()

export function useApplicationMenu() {
  const applicationManager = useApplicationManager()
  const applicationEntries = useApplicationEntries()

  const categories = computed(() => {
    return getSortedCategories(applicationManager.apps)
  })

  const appEntriesByActiveCategory = computed(() => {
    if (!categoryActive.value) {
      return []
    }

    return applicationEntries.sortedAppEntries(
      'title',
      (entry) => entry.category === categoryActive.value,
    ).value
  })

  return {
    enabled,
    categories,
    categoryActive,
    appEntriesByActiveCategory,
  }
}
