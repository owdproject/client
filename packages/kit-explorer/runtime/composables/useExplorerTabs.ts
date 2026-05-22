import type { IWindowController } from '@owdproject/core'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'

export type ExplorerNavSnapshot = { paths: string[]; index: number }

export type ExplorerTabModel = {
  id: string
  snapshot: ExplorerNavSnapshot
}

type FsExplorerLike = {
  basePath: { value: string }
  fsDirectoryNavigation: {
    history: { value: string[] }
    currentIndex: { value: number }
    snapshot: () => ExplorerNavSnapshot
    hydrate: (data: ExplorerNavSnapshot) => void
  }
  navigateToDirectory: (path: string) => Promise<void>
  setMetaPathSyncEnabled?: (value: boolean) => void
}

type PersistedExplorerTabs = {
  tabs: ExplorerTabModel[]
  activeId: string
}

export type UseExplorerTabsOptions = {
  metaKey?: string
  pathToLabel?: (path: string) => string
  closeLastTab?: () => void
}

function newExplorerTabId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  }
  return `t${Math.random().toString(36).slice(2, 12)}`
}

function currentPathFromSnapshot(s: ExplorerNavSnapshot): string {
  const paths = s.paths
  if (!paths.length) return '/'
  const i = Math.min(Math.max(0, s.index), paths.length - 1)
  return paths[i] ?? '/'
}

function defaultPathLabel(path: string): string {
  const p = (path || '/').trim() || '/'
  if (p === '/') return 'This PC'
  const parts = p.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? p
}

export function useExplorerTabs(
  window: IWindowController,
  fsExplorer: FsExplorerLike,
  options: UseExplorerTabsOptions = {},
) {
  const metaKey = options.metaKey ?? 'explorerTabs'
  const pathToLabel = options.pathToLabel ?? defaultPathLabel

  const tabs = ref<ExplorerTabModel[]>([])
  const activeTabId = ref('')
  let applyingTab = false

  const tabsDisplay = computed(() =>
    tabs.value.map((tab) => ({
      id: tab.id,
      label: pathToLabel(currentPathFromSnapshot(tab.snapshot)),
    })),
  )

  function persistMeta() {
    const payload: PersistedExplorerTabs = {
      tabs: tabs.value.map((tab) => ({
        id: tab.id,
        snapshot: {
          paths: [...tab.snapshot.paths],
          index: tab.snapshot.index,
        },
      })),
      activeId: activeTabId.value,
    }
    ;(window.meta as Record<string, unknown>)[metaKey] = payload
  }

  function saveActiveTabSnapshot() {
    const id = activeTabId.value
    const tab = tabs.value.find((x) => x.id === id)
    if (!tab) return
    tab.snapshot = fsExplorer.fsDirectoryNavigation.snapshot()
  }

  function syncTitle() {
    window.actions.setTitleOverride(pathToLabel(fsExplorer.basePath.value))
    window.meta.path = fsExplorer.basePath.value
  }

  async function applyTab(id: string) {
    const tab = tabs.value.find((x) => x.id === id)
    if (!tab) return
    applyingTab = true
    try {
      fsExplorer.fsDirectoryNavigation.hydrate({
        paths: [...tab.snapshot.paths],
        index: tab.snapshot.index,
      })
      const path = currentPathFromSnapshot(tab.snapshot)
      fsExplorer.basePath.value = path
      await fsExplorer.navigateToDirectory(path)
      syncTitle()
    } finally {
      applyingTab = false
    }
  }

  function initTabs() {
    fsExplorer.setMetaPathSyncEnabled?.(false)
    const raw = (window.meta as Record<string, unknown>)[metaKey] as
      | PersistedExplorerTabs
      | undefined

    if (
      raw?.tabs?.length &&
      raw.tabs.every((x) => x.id && Array.isArray(x.snapshot?.paths))
    ) {
      tabs.value = raw.tabs.map((x) => ({
        id: x.id,
        snapshot: {
          paths: [...x.snapshot.paths],
          index: x.snapshot.index,
        },
      }))
      const fallbackId = tabs.value[0]?.id ?? ''
      activeTabId.value =
        raw.activeId && tabs.value.some((x) => x.id === raw.activeId)
          ? raw.activeId
          : fallbackId
      void applyTab(activeTabId.value)
    } else {
      const id = newExplorerTabId()
      tabs.value = [
        {
          id,
          snapshot: fsExplorer.fsDirectoryNavigation.snapshot(),
        },
      ]
      activeTabId.value = id
      syncTitle()
    }
    persistMeta()
  }

  function selectTab(id: string) {
    if (id === activeTabId.value) return
    saveActiveTabSnapshot()
    activeTabId.value = id
    void applyTab(id)
    persistMeta()
  }

  function addTab() {
    saveActiveTabSnapshot()
    const snap = fsExplorer.fsDirectoryNavigation.snapshot()
    const id = newExplorerTabId()
    tabs.value.push({
      id,
      snapshot: { paths: [...snap.paths], index: snap.index },
    })
    activeTabId.value = id
    void applyTab(id)
    persistMeta()
  }

  function normalizeExplorerPath(p: string): string {
    let normalized = (p || '/').trim() || '/'
    if (!normalized.startsWith('/')) normalized = `/${normalized}`
    normalized = normalized.replace(/\/+/g, '/')
    if (normalized.length > 1) normalized = normalized.replace(/\/$/, '')
    return normalized || '/'
  }

  /** Opens an absolute VFS path in a new explorer tab (same window). */
  async function openPathInNewTab(absolutePath: string) {
    const normalized = normalizeExplorerPath(absolutePath)
    saveActiveTabSnapshot()
    const id = newExplorerTabId()
    const snapshot: ExplorerNavSnapshot = {
      paths: [normalized],
      index: 0,
    }
    tabs.value.push({ id, snapshot })
    activeTabId.value = id
    await applyTab(id)
    persistMeta()
  }

  function closeTab(id: string) {
    if (tabs.value.length <= 1) {
      if (options.closeLastTab) {
        options.closeLastTab()
      } else {
        window.destroy()
      }
      return
    }
    saveActiveTabSnapshot()
    const idx = tabs.value.findIndex((x) => x.id === id)
    if (idx < 0) return
    const wasActive = activeTabId.value === id
    tabs.value.splice(idx, 1)
    if (wasActive) {
      const nextIdx = Math.min(idx, tabs.value.length - 1)
      activeTabId.value = tabs.value[nextIdx]!.id
      void applyTab(activeTabId.value)
    }
    persistMeta()
  }

  watch(
    [
      () => fsExplorer.basePath.value,
      () => fsExplorer.fsDirectoryNavigation.history.value,
      () => fsExplorer.fsDirectoryNavigation.currentIndex.value,
    ],
    () => {
      if (applyingTab) return
      if (!activeTabId.value || tabs.value.length === 0) return
      saveActiveTabSnapshot()
      syncTitle()
      persistMeta()
    },
    { deep: true },
  )

  onUnmounted(() => {
    fsExplorer.setMetaPathSyncEnabled?.(true)
    window.actions.resetTitleOverride()
  })

  return reactive({
    tabs,
    tabsDisplay,
    activeTabId,
    pathToLabel,
    initTabs,
    selectTab,
    addTab,
    openPathInNewTab,
    closeTab,
  })
}
