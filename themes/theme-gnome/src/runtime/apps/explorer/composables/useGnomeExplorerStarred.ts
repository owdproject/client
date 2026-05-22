import { fs } from '@zenfs/core'
import { useRuntimeConfig } from 'nuxt/app'
import { computed, ref, watch } from 'vue'
import { useDesktopShellIdentity } from '@owdproject/kit-theme/runtime/composables/useDesktopShellIdentity'

export type GnomeStarredEntry = {
  path: string
  name: string
  starredAt: number
}

function vfsDirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i <= 0 ? '/' : path.slice(0, i)
}

function vfsBasename(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? path : path.slice(i + 1)
}

function resolveStarredPath(userHome: string, relativePath: string): string {
  const home = userHome.endsWith('/') ? userHome.slice(0, -1) : userHome
  const rel = relativePath.replace(/^\//, '')
  return `${home}/${rel}`
}

function readRegistry(filePath: string): GnomeStarredEntry[] {
  try {
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf8') as string
    const parsed = JSON.parse(raw) as { entries?: GnomeStarredEntry[] }
    const list = Array.isArray(parsed?.entries) ? parsed.entries : []
    return list
      .filter((e) => e && typeof e.path === 'string')
      .sort((a, b) => (b.starredAt ?? 0) - (a.starredAt ?? 0))
  } catch {
    return []
  }
}

function writeRegistry(filePath: string, entries: GnomeStarredEntry[]) {
  const dir = vfsDirname(filePath)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      filePath,
      JSON.stringify({ version: 1, entries }, null, 2),
    )
  } catch (err) {
    console.warn('[theme-gnome] Could not persist starred registry', err)
  }
}

export function useGnomeExplorerStarred() {
  const { userHome } = useDesktopShellIdentity()
  const config = useRuntimeConfig()
  const desktop = config.public.desktop as {
    fs?: { starredFiles?: { relativePath?: string } }
  }
  const relativePath =
    desktop.fs?.starredFiles?.relativePath?.trim() ||
    '.local/share/starred.json'

  const registryPath = computed(() =>
    resolveStarredPath(userHome.value, relativePath),
  )
  const entries = ref<GnomeStarredEntry[]>([])

  function load() {
    entries.value = readRegistry(registryPath.value)
  }

  function toggleStar(path: string) {
    if (!path?.startsWith('/')) return
    const idx = entries.value.findIndex((e) => e.path === path)
    if (idx >= 0) {
      entries.value = entries.value.filter((e) => e.path !== path)
    } else {
      entries.value = [
        {
          path,
          name: vfsBasename(path),
          starredAt: Date.now(),
        },
        ...entries.value,
      ]
    }
    writeRegistry(registryPath.value, entries.value)
  }

  function isStarred(path: string) {
    return entries.value.some((e) => e.path === path)
  }

  watch(registryPath, load, { immediate: true })

  return {
    starredEntries: computed(() => entries.value),
    load,
    toggleStar,
    isStarred,
  }
}
