import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationEntries } from '@owdproject/core/runtime/composables/useApplicationEntries'
import { useDesktopDefaultAppsStore } from '@owdproject/core/runtime/stores/storeDesktopDefaultApps'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { computed, ref, watch, type UnwrapRef } from 'vue'

/** Device-local shell prefs (survives reload). Desktop volume etc. use Pinia persist — same idea, separate keys until unified. */
const STORAGE_PINNED = 'owd.shell.win11.start.pinned'
const STORAGE_RECENT = 'owd.shell.win11.start.recent'
const STORAGE_ALL_VIEW = 'owd.shell.win11.start.allView'

export type Win11AllAppsView = 'category' | 'grid' | 'list'

function loadJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function entryStorageKey(
  entry: {
    application: { id: string }
    command: string | unknown
  },
): string {
  return `${entry.application.id}::${String(entry.command)}`
}

/**
 * Win11 Start flyout: pinned (persisted), recommended (recent launches), all apps by category,
 * plus shutdown / default apps.
 */
export function useWin11StartMenu() {
  const applicationManager = useApplicationManager()
  const appEntriesApi = useApplicationEntries()
  const desktopDefaultAppsStore = useDesktopDefaultAppsStore()
  const session = useDesktopSession()

  const apps = appEntriesApi.sortedAppEntries('title', 'primary')
  type AppEntry = UnwrapRef<typeof apps>[number]

  const pinnedIds = ref<string[]>([])
  const recentIds = ref<string[]>([])
  const allAppsView = ref<Win11AllAppsView>('category')

  function hydrateFromStorage() {
    pinnedIds.value = loadJson<string[]>(STORAGE_PINNED, [])
    recentIds.value = loadJson<string[]>(STORAGE_RECENT, [])
    const raw = loadJson(STORAGE_ALL_VIEW, 'category')
    allAppsView.value =
      raw === 'grid' || raw === 'list' || raw === 'category' ? raw : 'category'
  }

  if (typeof window !== 'undefined') {
    hydrateFromStorage()
  }

  watch(allAppsView, (v) => {
    saveJson(STORAGE_ALL_VIEW, v)
  })

  const entryByKey = computed(() => {
    const m = new Map<string, AppEntry>()
    for (const e of apps.value) {
      m.set(entryStorageKey(e), e)
    }
    return m
  })

  const pinnedEntries = computed(() => {
    const keys = pinnedIds.value
    const out: AppEntry[] = []
    for (const id of keys) {
      const e = entryByKey.value.get(id)
      if (e) out.push(e)
    }
    return out
  })

  const recommendedEntries = computed(() => {
    const pinned = new Set(pinnedIds.value)
    const out: AppEntry[] = []
    for (const id of recentIds.value) {
      if (pinned.has(id)) continue
      const e = entryByKey.value.get(id)
      if (e && !out.includes(e)) out.push(e)
      if (out.length >= 6) break
    }
    return out
  })

  /** Categories → entries (primary apps), stable sort inside each category by title */
  const appsByCategory = computed(() => {
    const map = new Map<string, AppEntry[]>()
    for (const e of apps.value) {
      const cat = (e.category || '').trim() || 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(e)
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', undefined, {
          sensitivity: 'base',
        }),
      )
    }
    return map
  })

  const categoryKeysSorted = computed(() => {
    const keys = [...appsByCategory.value.keys()]
    keys.sort((a, b) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    return keys
  })

  function pushRecent(entry: AppEntry) {
    hydrateFromStorage()
    const k = entryStorageKey(entry)
    recentIds.value = [k, ...recentIds.value.filter((x) => x !== k)].slice(
      0,
      12,
    )
    saveJson(STORAGE_RECENT, recentIds.value)
  }

  function togglePin(entry: AppEntry) {
    hydrateFromStorage()
    const k = entryStorageKey(entry)
    if (pinnedIds.value.includes(k)) {
      pinnedIds.value = pinnedIds.value.filter((x) => x !== k)
    } else {
      pinnedIds.value = [...pinnedIds.value, k].slice(0, 36)
    }
    saveJson(STORAGE_PINNED, pinnedIds.value)
  }

  function isPinned(entry: AppEntry) {
    return pinnedIds.value.includes(entryStorageKey(entry))
  }

  /** Persist order after drag-and-drop in the Pinned grid. */
  function applyPinnedOrder(entries: AppEntry[]) {
    hydrateFromStorage()
    pinnedIds.value = entries.map(entryStorageKey)
    saveJson(STORAGE_PINNED, pinnedIds.value)
  }

  function persistPinnedOrder(keys: string[]) {
    pinnedIds.value = keys
    saveJson(STORAGE_PINNED, pinnedIds.value)
  }

  function movePinnedLeft(entry: AppEntry) {
    hydrateFromStorage()
    const k = entryStorageKey(entry)
    const i = pinnedIds.value.indexOf(k)
    if (i <= 0) return
    const next = [...pinnedIds.value]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    persistPinnedOrder(next)
  }

  function movePinnedRight(entry: AppEntry) {
    hydrateFromStorage()
    const k = entryStorageKey(entry)
    const i = pinnedIds.value.indexOf(k)
    if (i < 0 || i >= pinnedIds.value.length - 1) return
    const next = [...pinnedIds.value]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    persistPinnedOrder(next)
  }

  function movePinnedToFront(entry: AppEntry) {
    hydrateFromStorage()
    const k = entryStorageKey(entry)
    persistPinnedOrder([k, ...pinnedIds.value.filter((x) => x !== k)])
  }

  function launchEntry(entry: AppEntry) {
    void entry.application.execCommand(entry.command)
    pushRecent(entry)
  }

  const terminalShortcut = computed(() =>
    desktopDefaultAppsStore.getDefaultApp('terminal'),
  )

  const authShortcut = computed(() =>
    desktopDefaultAppsStore.getDefaultApp('auth'),
  )

  function openDocumentsFolder() {
    void applicationManager.launchAppEntry(
      'org.owdproject.explorer',
      'explorer',
      '/',
    )
  }

  function powerOff() {
    session.initiateShutdownToStart()
  }

  return {
    apps,
    pinnedEntries,
    recommendedEntries,
    appsByCategory,
    categoryKeysSorted,
    allAppsView,
    pinnedIds,
    hydrateFromStorage,
    togglePin,
    isPinned,
    applyPinnedOrder,
    movePinnedLeft,
    movePinnedRight,
    movePinnedToFront,
    entryStorageKey,
    launchEntry,
    terminalShortcut,
    authShortcut,
    openDocumentsFolder,
    powerOff,
    execAuth: () => {
      const a = authShortcut.value as
        | { applicationId: string; command?: string }
        | undefined
      if (a?.command) {
        void applicationManager.execAppCommand(a.applicationId, a.command)
      }
    },
    launchTerminal: () => {
      const t = terminalShortcut.value
      if (t) {
        void applicationManager.launchAppEntry(t.applicationId, t.entry)
      }
    },
  }
}
