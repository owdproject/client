import { fs } from '@zenfs/core'

export type FsRecentFileEntry = {
  path: string
  name: string
  extension: string
  openedAt: number
  size?: number
}

const RECENT_CAP = 50

function vfsDirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i <= 0 ? '/' : path.slice(0, i)
}

function vfsBasename(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? path : path.slice(i + 1)
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function resolveRecentFilesPath(
  userHome: string,
  relativePath: string,
): string {
  const home = userHome.endsWith('/') ? userHome.slice(0, -1) : userHome
  const rel = relativePath.replace(/^\//, '')
  return `${home}/${rel}`
}

export function readRecentFilesRegistry(
  filePath: string,
): FsRecentFileEntry[] {
  try {
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf8') as string
    const parsed = JSON.parse(raw) as { entries?: FsRecentFileEntry[] }
    const list = Array.isArray(parsed?.entries) ? parsed.entries : []
    return list
      .filter((e) => e && typeof e.path === 'string')
      .sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0))
  } catch {
    return []
  }
}

export function writeRecentFilesRegistry(
  filePath: string,
  entries: FsRecentFileEntry[],
) {
  const dir = vfsDirname(filePath)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      filePath,
      JSON.stringify({ version: 1, entries }, null, 2),
    )
  } catch (err) {
    console.warn('[module-fs] Could not persist recent files registry', err)
  }
}

export function buildRecentEntry(path: string): FsRecentFileEntry {
  const name = vfsBasename(path)
  let size: number | undefined
  try {
    const stats = fs.statSync(path)
    if (stats && typeof stats.size === 'number') size = stats.size
  } catch {
    /* ignore */
  }
  return {
    path,
    name,
    extension: fileExtension(name),
    openedAt: Date.now(),
    size,
  }
}

export function upsertRecentEntry(
  entries: FsRecentFileEntry[],
  path: string,
): FsRecentFileEntry[] {
  const next = buildRecentEntry(path)
  const filtered = entries.filter((e) => e.path !== path)
  return [next, ...filtered].slice(0, RECENT_CAP)
}

export function filterRecentEntries(
  entries: FsRecentFileEntry[],
  query: string,
  extensions?: string[],
): FsRecentFileEntry[] {
  const q = query.trim().toLowerCase()
  const extSet =
    extensions && extensions.length
      ? new Set(extensions.map((e) => e.toLowerCase()))
      : null

  return entries.filter((entry) => {
    if (extSet && entry.extension && !extSet.has(entry.extension)) {
      return false
    }
    if (!q) return true
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.extension.toLowerCase().includes(q) ||
      entry.path.toLowerCase().includes(q)
    )
  })
}
