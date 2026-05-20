import { ref, computed } from 'vue'
import { useAppConfig } from 'nuxt/app'
import { useMediaQuery, useScrollLock } from '@vueuse/core'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationEntries } from '@owdproject/core/runtime/composables/useApplicationEntries'

const open = ref(false)
const searchQuery = ref('')
/** When set, overrides `systemBar.launcherPresentation` for the current open session. */
const presentationOverride = ref<NovaLauncherPresentation | null>(null)

export type NovaLauncherPresentation = 'compact' | 'fullscreen' | 'responsive'

type NovaSystemBarConfig = DesktopSystemBarConfig & {
  launcherPresentation?: NovaLauncherPresentation
}

function isValidEntry(
  entry: ApplicationEntryWithInherited | undefined | null,
): entry is ApplicationEntryWithInherited {
  return Boolean(entry?.application?.id && entry.command)
}

export function useNovaStartMenu() {
  const appConfig = useAppConfig()
  const applicationManager = useApplicationManager()
  const applicationEntries = useApplicationEntries()
  const isMobileViewport = useMediaQuery('(max-width: 768px)')

  const launcherPresentation = computed(() => {
    const bar = appConfig.desktop?.systemBar as NovaSystemBarConfig | undefined
    return bar?.launcherPresentation ?? 'responsive'
  })

  const useFullscreenLauncher = computed(() => {
    const override = presentationOverride.value
    if (override === 'fullscreen') return true
    if (override === 'compact') return false
    const mode = launcherPresentation.value
    if (mode === 'fullscreen') return true
    if (mode === 'compact') return false
    return isMobileViewport.value
  })

  function syncScrollLock() {
    bodyScrollLock.value = open.value && useFullscreenLauncher.value
  }

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

  function toggle() {
    open.value = !open.value
    if (open.value) {
      searchQuery.value = ''
    } else {
      presentationOverride.value = null
      searchQuery.value = ''
    }
    syncScrollLock()
  }

  /** Dock menu button: always opens the full-screen app launcher. */
  function toggleDockLauncher() {
    if (open.value && presentationOverride.value === 'fullscreen') {
      close()
      return
    }
    presentationOverride.value = 'fullscreen'
    if (!open.value) {
      open.value = true
      searchQuery.value = ''
    }
    syncScrollLock()
  }

  function close() {
    open.value = false
    presentationOverride.value = null
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
    useFullscreenLauncher,
    launcherPresentation,
    toggle,
    toggleDockLauncher,
    close,
    launchEntry,
  }
}
