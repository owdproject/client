import { useApplicationEntries } from '@owdproject/core/runtime/composables/useApplicationEntries'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useFsRecentFiles } from '@owdproject/module-fs/runtime/composables/useFsRecentFiles'
import { openVfsFile } from '@owdproject/module-fs/runtime/utils/utilFsOpenFile'
import type { FsRecentFileEntry } from '@owdproject/module-fs/runtime/utils/utilFsRecentFiles'
import { computed, ref, watch, type UnwrapRef } from 'vue'

/** Device-local shell prefs (survives reload). */
const STORAGE_PINNED = 'owd.shell.win11.start.pinned'
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

export function sortAppsAlphabetically<T extends { title?: string }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', undefined, {
      sensitivity: 'base',
    }),
  )
}

export function formatRecentFileDate(openedAt: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(openedAt))
  } catch {
    return ''
  }
}

export function formatRecentFileSize(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function recentFileIcon(extension: string): string {
  const ext = extension.toLowerCase()
  if (['mp4', 'webm', 'mkv', 'avi'].includes(ext)) return 'mdi:file-video'
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'mdi:file-music'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext))
    return 'mdi:file-image'
  if (['txt', 'md', 'json'].includes(ext)) return 'mdi:file-document-outline'
  return 'mdi:file-outline'
}

/**
 * Win11 Start flyout: pinned apps, recommended/recent files, all apps by category.
 */
export function useWin11StartMenu() {
  const appEntriesApi = useApplicationEntries()
  const session = useDesktopSession()
  const {
    recentFiles,
    loadRecentFiles,
    recordRecentFile,
    filterRecentFiles,
  } = useFsRecentFiles()

  const apps = appEntriesApi.sortedAppEntries('title', 'primary')
  type AppEntry = UnwrapRef<typeof apps>[number]

  const pinnedIds = ref<string[]>([])
  const allAppsView = ref<Win11AllAppsView>('category')

  function hydrateFromStorage() {
    pinnedIds.value = loadJson<string[]>(STORAGE_PINNED, [])
    const raw = loadJson(STORAGE_ALL_VIEW, 'category')
    allAppsView.value =
      raw === 'grid' || raw === 'list' || raw === 'category' ? raw : 'category'
    loadRecentFiles()
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

  const recommendedFiles = computed(() => recentFiles.value.slice(0, 6))

  const allRecentFiles = computed(() => recentFiles.value)

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

  const alphabeticalApps = computed(() => sortAppsAlphabetically(apps.value))

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
  }

  async function openRecentFile(entry: FsRecentFileEntry) {
    const ok = await openVfsFile(entry.path)
    if (ok) recordRecentFile(entry.path)
  }

  function powerOff() {
    session.initiateShutdownToStart()
  }

  return {
    apps,
    pinnedEntries,
    recommendedFiles,
    allRecentFiles,
    filterRecentFiles,
    appsByCategory,
    categoryKeysSorted,
    alphabeticalApps,
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
    openRecentFile,
    powerOff,
    formatRecentFileDate,
    formatRecentFileSize,
    recentFileIcon,
  }
}
