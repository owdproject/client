import { useRuntimeConfig } from 'nuxt/app'
import { computed, ref } from 'vue'
import { useFsRecentFiles } from '@owdproject/module-fs/runtime/composables/useFsRecentFiles'
import { useGnomeExplorerStarred } from './useGnomeExplorerStarred'

export type GnomePlaceId =
  | 'home'
  | 'recent'
  | 'starred'
  | 'network'
  | 'trash'
  | 'folder'

/** ZenFS trash folder used by module-fs (see useFileSystemExplorer TRASH_PATH). */
export const GNOME_TRASH_PATH = '/tmp'

export function useGnomeExplorerPlaces() {
  const activePlaceId = ref<GnomePlaceId>('home')
  const activeFolderPath = ref<string | null>(null)

  const { recentFiles, loadRecentFiles } = useFsRecentFiles()
  const { starredEntries } = useGnomeExplorerStarred()
  const runtimeConfig = useRuntimeConfig()

  type FolderEntry = {
    id: string
    label: string
    path: string
    icon?: string
  }

  const explorerConfig = computed(
    () =>
      (runtimeConfig.public.desktop.explorer ?? {}) as {
        mountLabels?: Record<string, string>
        specialFolders?: FolderEntry[]
        specialFoldersExtra?: FolderEntry[]
        specialFoldersOverride?: FolderEntry[]
      },
  )

  const fsMounts = computed(() => {
    const raw = runtimeConfig.public.desktop.fs?.mounts
    if (!raw || typeof raw !== 'object') return {} as Record<string, unknown>
    return raw as Record<string, unknown>
  })

  const networkVolumes = computed(() =>
    Object.keys(fsMounts.value)
      .filter((p) => p !== '/' && !p.split('/').filter(Boolean)[0]?.startsWith('.'))
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        path,
        label:
          explorerConfig.value.mountLabels?.[path] ??
          path.split('/').filter(Boolean).pop() ??
          path,
        icon: 'mdi:server-network' as const,
      })),
  )

  function normalizeFolders(list: unknown) {
    if (!Array.isArray(list)) return []
    return list
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const entry = item as Record<string, unknown>
        const id = String(entry.id ?? '').trim()
        const label = String(entry.label ?? '').trim()
        const rawPath = String(entry.path ?? '').trim()
        const icon = String(entry.icon ?? '').trim()
        if (!id || !label || !rawPath) return null
        return {
          id,
          label,
          path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`,
          icon: icon || 'mdi:folder',
        }
      })
      .filter(Boolean) as {
      id: string
      label: string
      path: string
      icon: string
    }[]
  }

  const userFolders = computed(() => {
    const cfg = explorerConfig.value
    const override = normalizeFolders(cfg.specialFoldersOverride)
    if (override.length) return override
    return [
      ...normalizeFolders(cfg.specialFolders),
      ...normalizeFolders(cfg.specialFoldersExtra),
    ]
  })

  function selectPlace(id: GnomePlaceId, folderPath?: string) {
    activePlaceId.value = id
    activeFolderPath.value = folderPath ?? null
    if (id === 'recent') loadRecentFiles()
  }

  function browsePathForPlace(): string | null {
    switch (activePlaceId.value) {
      case 'home':
        return '/'
      case 'trash':
        return GNOME_TRASH_PATH
      case 'folder':
        return activeFolderPath.value
      default:
        return null
    }
  }

  return {
    activePlaceId,
    activeFolderPath,
    recentFiles,
    starredEntries,
    networkVolumes,
    userFolders,
    selectPlace,
    browsePathForPlace,
  }
}
