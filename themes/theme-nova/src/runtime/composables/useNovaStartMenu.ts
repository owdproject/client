import { ref, computed } from 'vue'
import { useScrollLock } from '@vueuse/core'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationEntries } from '@owdproject/core/runtime/composables/useApplicationEntries'

const open = ref(false)
const searchQuery = ref('')

function isValidEntry(
  entry: ApplicationEntryWithInherited | undefined | null,
): entry is ApplicationEntryWithInherited {
  return Boolean(entry?.application?.id && entry.command)
}

export function useNovaStartMenu() {
  const applicationManager = useApplicationManager()
  const applicationEntries = useApplicationEntries()

  const bodyScrollLock = useScrollLock(
    typeof document !== 'undefined' ? document.body : null,
  )

  const allEntries = computed(() =>
    applicationEntries
      .sortedAppEntries('title', 'primary')
      .value.filter(isValidEntry),
  )

  const filteredEntries = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const entries = allEntries.value
    if (!q) return entries
    return entries.filter((entry) =>
      (entry.title ?? '').toLowerCase().includes(q),
    )
  })

  function syncScrollLock() {
    bodyScrollLock.value = open.value
  }

  function toggle() {
    open.value = !open.value
    searchQuery.value = ''
    syncScrollLock()
  }

  function close() {
    open.value = false
    searchQuery.value = ''
    bodyScrollLock.value = false
  }

  async function launchEntry(entry: ApplicationEntryWithInherited) {
    if (!isValidEntry(entry)) return
    await applicationManager.execAppCommand(
      entry.application.id,
      entry.command,
    )
    close()
  }

  return {
    open,
    searchQuery,
    allEntries,
    filteredEntries,
    toggle,
    close,
    launchEntry,
  }
}
