import { useRuntimeConfig } from 'nuxt/app'
import { computed, ref, watch } from 'vue'
import { useDesktopShellIdentity } from '@owdproject/kit-theme/runtime/composables/useDesktopShellIdentity'
import {
  filterRecentEntries,
  readRecentFilesRegistry,
  resolveRecentFilesPath,
  upsertRecentEntry,
  writeRecentFilesRegistry,
  type FsRecentFileEntry,
} from '../utils/utilFsRecentFiles'

function recentConfig() {
  const config = useRuntimeConfig()
  const desktop = config.public.desktop as {
    fs?: {
      defaultUserHome?: string
      recentFiles?: { relativePath?: string }
    }
  }
  return {
    relativePath:
      desktop.fs?.recentFiles?.relativePath?.trim() ||
      '.local/share/recently-used.json',
  }
}

export function useFsRecentFiles() {
  const { userHome } = useDesktopShellIdentity()
  const entries = ref<FsRecentFileEntry[]>([])
  const registryPath = computed(() =>
    resolveRecentFilesPath(userHome.value, recentConfig().relativePath),
  )

  function loadRecentFiles() {
    entries.value = readRecentFilesRegistry(registryPath.value)
  }

  function recordRecentFile(path: string) {
    if (!path?.startsWith('/')) return
    entries.value = upsertRecentEntry(entries.value, path)
    writeRecentFilesRegistry(registryPath.value, entries.value)
  }

  const recentFiles = computed(() =>
    [...entries.value].sort((a, b) => b.openedAt - a.openedAt),
  )

  function filterRecentFiles(query: string, extensions?: string[]) {
    return filterRecentEntries(recentFiles.value, query, extensions)
  }

  watch(
    registryPath,
    () => {
      loadRecentFiles()
    },
    { immediate: true },
  )

  return {
    recentFiles,
    loadRecentFiles,
    recordRecentFile,
    filterRecentFiles,
    registryPath,
  }
}
