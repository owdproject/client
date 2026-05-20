import { ref, computed, watch } from 'vue'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationEntries } from '@owdproject/core/runtime/composables/useApplicationEntries'
import { getSortedCategories } from '../utils/utilsApplications'

const enabled = ref(false)
const categoryActive = ref<string>()

function pickDefaultCategory(categories: string[]) {
  if (!categories.length) return undefined
  const preferred = categories.find((c) => c === 'system-tools') ?? categories[0]
  return preferred
}

export function useApplicationMenu() {
  const applicationManager = useApplicationManager()
  const applicationEntries = useApplicationEntries()

  const categories = computed(() =>
    getSortedCategories(applicationManager.apps),
  )

  const primaryEntries = computed(() =>
    applicationEntries.sortedAppEntries('title', 'primary').value,
  )

  const menuEntries = computed(() => {
    const all = primaryEntries.value
    if (!all.length) return []

    const active = categoryActive.value
    if (!active) return all

    const filtered = all.filter((entry) => entry.category === active)
    return filtered.length ? filtered : all
  })

  function syncActiveCategory() {
    const cats = categories.value
    if (!cats.length) {
      categoryActive.value = undefined
      return
    }
    if (
      !categoryActive.value ||
      !cats.includes(categoryActive.value)
    ) {
      categoryActive.value = pickDefaultCategory(cats)
    }
  }

  watch(enabled, (open) => {
    if (open) syncActiveCategory()
  })

  watch(categories, () => {
    if (enabled.value) syncActiveCategory()
  })

  watch(
    () => applicationManager.appsEntries.value.length,
    () => {
      if (enabled.value) syncActiveCategory()
    },
  )

  return {
    enabled,
    categories,
    categoryActive,
    menuEntries,
    primaryEntries,
    /** @deprecated use menuEntries */
    appEntriesByActiveCategory: menuEntries,
  }
}
