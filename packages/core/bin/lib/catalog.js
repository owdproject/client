import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import {
  KINDS,
  SCOPE,
  fullName,
  shortName,
  inferKind,
  isInstallableDesktopModule,
  desktopMetaDir,
} from './workspace.js'
import { hasLocalWorkspaceSource } from './install.js'
import { enrichCatalogEntries, isTrustedPublisher } from './packageSources.js'

const CACHE_TTL_MS = 60 * 60 * 1000

/** @typedef {'updated' | 'name' | 'stars' | 'installed'} CatalogSortMode */

export const CATALOG_SORT_MODES = /** @type {const} */ ([
  'updated',
  'name',
  'stars',
  'installed',
])

/** @type {Record<CatalogSortMode, string>} */
export const CATALOG_SORT_LABELS = {
  updated: 'Updated',
  name: 'Name',
  stars: 'Stars',
  installed: 'Installed',
}

/** @type {Record<CatalogSortMode, string>} */
export const CATALOG_SORT_DESCRIPTIONS = {
  updated: 'Recent GitHub activity',
  name: 'A-Z package name',
  stars: 'GitHub star count',
  installed: 'On desktop first',
}

/**
 * @param {{ apps?: string[], modules?: string[], theme?: string }} config
 * @param {Map<string, boolean>} [pendingPackages]
 * @param {string | null | undefined} [pendingTheme]
 */
export function effectiveInstalledSets(config, pendingPackages = new Map(), pendingTheme) {
  const apps = new Set(config?.apps ?? [])
  const modules = new Set(config?.modules ?? [])
  let theme = pendingTheme ?? config?.theme ?? null

  for (const [name, on] of pendingPackages) {
    const kind = inferKind(shortName(name))
    if (kind === 'app') {
      if (on) apps.add(name)
      else apps.delete(name)
    } else if (kind === 'module') {
      if (on) modules.add(name)
      else modules.delete(name)
    } else if (kind === 'theme') {
      if (on) theme = name
      else if (theme === name) theme = config?.theme ?? null
    }
  }

  return {
    apps: [...apps],
    modules: [...modules],
    theme,
  }
}

function cachePath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'catalog-cache.json')
}

function readCacheFile(workspaceRoot) {
  const path = cachePath(workspaceRoot)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function readCache(workspaceRoot) {
  const data = readCacheFile(workspaceRoot)
  if (!data?.entries) return null
  if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null
  const ageMin = Math.round((Date.now() - data.fetchedAt) / 60_000)
  return { entries: data.entries, cacheAge: `${ageMin}m` }
}

/** Names from last cache file (even expired) for isNew detection. */
function readPreviousCatalogNames(workspaceRoot) {
  const data = readCacheFile(workspaceRoot)
  if (!data?.entries?.length) return new Set()
  return new Set(data.entries.map((e) => e.shortName))
}

function formatCacheAge(fetchedAt) {
  const ageMin = Math.round((Date.now() - fetchedAt) / 60_000)
  if (ageMin < 1) return '<1m'
  if (ageMin < 60) return `${ageMin}m`
  return `${Math.round(ageMin / 60)}h`
}

function writeCache(workspaceRoot, entries) {
  mkdirSync(desktopMetaDir(workspaceRoot), { recursive: true })
  writeFileSync(
    cachePath(workspaceRoot),
    JSON.stringify({ fetchedAt: Date.now(), entries }, null, 2),
  )
}

function mapGithubRepo(repo, org) {
  return {
    shortName: repo.name,
    description: repo.description ?? '',
    stars: repo.stargazers_count ?? 0,
    htmlUrl: repo.html_url,
    pushedAt: repo.pushed_at ?? null,
    updatedAt: repo.updated_at ?? repo.pushed_at ?? null,
    org: repo.owner?.login ?? org,
    kind: inferKind(repo.name),
  }
}

function localPackageUpdatedAt(packageDir) {
  try {
    return execSync(`git -C ${packageDir} log -1 --format=%cI`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    const pkgPath = join(packageDir, 'package.json')
    if (existsSync(pkgPath)) {
      return new Date(statSync(pkgPath).mtime).toISOString()
    }
  }
  return null
}

/**
 * @param {object[]} entries
 * @param {Set<string>} previousNames
 * @param {number} newDays
 */
function annotateDiscoveryFlags(entries, previousNames, newDays) {
  const cutoff = Date.now() - newDays * 24 * 60 * 60 * 1000
  const now = new Date().toISOString()

  return entries.map((entry) => {
    const isNew = !previousNames.has(entry.shortName)
    const pushedMs = entry.pushedAt ? new Date(entry.pushedAt).getTime() : 0
    const isRecent = pushedMs > 0 && pushedMs >= cutoff
    return {
      ...entry,
      firstSeenAt: isNew ? now : entry.firstSeenAt ?? now,
      isNew,
      isRecent: isNew || isRecent,
    }
  })
}

async function fetchTopic(topic, org) {
  const q = encodeURIComponent(`topic:${topic} org:${org}`)
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=100`
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'owd-desktop-cli',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${org}/${topic}`)
  const json = await res.json()
  return (json.items ?? []).map((repo) => mapGithubRepo(repo, org))
}

async function fetchUserRepos(user) {
  const url = `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'owd-desktop-cli',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) return []
  const repos = await res.json()
  return repos
    .filter((repo) => /^(app|theme|module|kit)-/.test(repo.name))
    .map((repo) => mapGithubRepo(repo, user))
}

function scanLocal(workspaceRoot, kind) {
  const dir = join(workspaceRoot, KINDS[kind].workspaceDir)
  if (!existsSync(dir)) return []

  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const packageDir = join(dir, d.name)
      const pkgPath = join(packageDir, 'package.json')
      if (!existsSync(pkgPath)) return null
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        if (!pkg.name?.startsWith(SCOPE)) return null
        let remote = null
        try {
          remote = execSync(`git -C ${packageDir} remote get-url origin`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim()
        } catch {
          /* no git */
        }
        const updatedAt = localPackageUpdatedAt(packageDir)
        return {
          shortName: shortName(pkg.name),
          description: pkg.description ?? '',
          stars: 0,
          htmlUrl: pkg.homepage ?? pkg.repository?.url ?? null,
          pushedAt: updatedAt,
          updatedAt,
          org: 'workspace',
          kind,
          localPath: join(KINDS[kind].workspaceDir, d.name),
          remote,
          version: pkg.version,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export async function loadCatalog(workspaceRoot, settings, options = {}) {
  const previousNames = readPreviousCatalogNames(workspaceRoot)
  const newDays = settings.catalogNewDays ?? 14

  const cached = options.force ? null : readCache(workspaceRoot)
  let remote = cached?.entries ?? null
  let cacheAge = cached?.cacheAge ?? null

  if (!remote) {
    remote = []
    const orgs = [...new Set([...(settings.githubOrgs ?? ['owdproject']), settings.githubUser].filter(Boolean))]

    for (const org of orgs) {
      for (const kind of Object.keys(KINDS)) {
        try {
          const items = await fetchTopic(KINDS[kind].topic, org)
          remote.push(...items)
        } catch {
          /* offline — use local only */
        }
      }
    }

    if (settings.githubUser && !orgs.includes(settings.githubUser)) {
      try {
        remote.push(...(await fetchUserRepos(settings.githubUser)))
      } catch {
        /* ignore */
      }
    }

    if (remote.length) {
      remote = annotateDiscoveryFlags(remote, previousNames, newDays)
      writeCache(workspaceRoot, remote)
      cacheAge = formatCacheAge(Date.now())
    }
  }

  const byName = new Map()

  for (const item of remote ?? []) {
    byName.set(item.shortName, { ...item, sources: [item.org] })
  }

  for (const kind of Object.keys(KINDS)) {
    for (const item of scanLocal(workspaceRoot, kind)) {
      const prev = byName.get(item.shortName)
      if (prev) {
        byName.set(item.shortName, {
          ...prev,
          ...item,
          localPath: item.localPath,
          remote: item.remote ?? prev.remote,
          updatedAt: item.updatedAt ?? prev.updatedAt,
          pushedAt: item.pushedAt ?? prev.pushedAt,
          sources: [...new Set([...(prev.sources ?? []), 'workspace'])],
        })
      } else {
        byName.set(item.shortName, {
          ...item,
          sources: ['workspace'],
          isNew: false,
          isRecent: false,
        })
      }
    }
  }

  let entries = [...byName.values()].map((entry) => ({
    ...entry,
    name: fullName(entry.shortName),
    kind: entry.kind ?? inferKind(entry.shortName),
    trusted: isTrustedPublisher(entry, settings),
  }))

  entries = await enrichCatalogEntries(entries, workspaceRoot, settings)

  return {
    entries,
    cacheAge: cacheAge ?? 'live',
  }
}

function updatedTimestamp(entry) {
  const raw = entry.updatedAt ?? entry.pushedAt
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * @param {object[]} entries
 * @param {CatalogSortMode} mode
 * @param {{ apps?: string[], modules?: string[], theme?: string } | null} [config]
 */
export function sortCatalog(entries, mode, config = null) {
  const installedApps = new Set(config?.apps ?? [])
  const installedModules = new Set(config?.modules ?? [])
  const activeTheme = config?.theme

  const isInstalled = (entry) => {
    if (entry.kind === 'app') return installedApps.has(entry.name)
    if (entry.kind === 'module') return installedModules.has(entry.name)
    if (entry.kind === 'theme') return activeTheme === entry.name
    return false
  }

  const sorted = [...entries]

  sorted.sort((a, b) => {
    if (mode === 'installed') {
      const ai = isInstalled(a) ? 1 : 0
      const bi = isInstalled(b) ? 1 : 0
      if (bi !== ai) return bi - ai
      const du = updatedTimestamp(b) - updatedTimestamp(a)
      if (du !== 0) return du
      return a.shortName.localeCompare(b.shortName)
    }

    if (mode === 'name') {
      return a.shortName.localeCompare(b.shortName)
    }

    if (mode === 'stars') {
      return (b.stars ?? 0) - (a.stars ?? 0) || a.shortName.localeCompare(b.shortName)
    }

    // updated (default)
    const du = updatedTimestamp(b) - updatedTimestamp(a)
    if (du !== 0) return du
    return a.shortName.localeCompare(b.shortName)
  })

  return sorted
}

/**
 * @param {CatalogSortMode} mode
 */
export function normalizeCatalogSort(mode) {
  return CATALOG_SORT_MODES.includes(mode) ? mode : 'updated'
}

/**
 * @param {object[]} catalog
 * @param {'app' | 'module' | 'theme'} kind
 * @param {{ sortMode?: CatalogSortMode, config?: { apps?: string[], modules?: string[], theme?: string } }} [options]
 */
export function filterCatalog(catalog, kind, options = {}) {
  const sortMode = normalizeCatalogSort(options.sortMode ?? 'updated')
  const filtered = catalog
    .filter((e) => e.kind === kind)
    .filter((e) => kind !== 'module' || isInstallableDesktopModule(e.name))

  return sortCatalog(filtered, sortMode, options.config ?? null)
}

export function mergeInstalled(catalog, config, deps, workspaceRoot) {
  const installedApps = new Set(config.apps ?? [])
  const installedModules = new Set(config.modules ?? [])
  const activeTheme = config.theme

  return catalog.map((entry) => {
    let installed = false
    if (entry.kind === 'app') installed = installedApps.has(entry.name)
    else if (entry.kind === 'module') installed = installedModules.has(entry.name)
    else if (entry.kind === 'theme') installed = activeTheme === entry.name

    const localSource = workspaceRoot
      ? hasLocalWorkspaceSource(workspaceRoot, entry.name)
      : entry.org === 'workspace'

    return {
      ...entry,
      installed,
      localSource,
      inPackageJson: deps.includes(entry.name),
      activeTheme: entry.kind === 'theme' && activeTheme === entry.name,
    }
  })
}

/** @param {string | null | undefined} iso */
export function formatCatalogAge(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const days = Math.floor(ms / 86_400_000)
  if (days < 1) return '<1d'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export function readThemeMeta(workspaceRoot, themePkgName) {
  const short = shortName(themePkgName)
  const localDir = join(workspaceRoot, 'themes', short)
  const pkgPath = join(localDir, 'package.json')

  if (!existsSync(pkgPath)) {
    return {
      name: themePkgName,
      description: 'Theme package not in workspace',
      version: '—',
      author: '—',
      remote: null,
      license: '—',
    }
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  let remote = null
  try {
    remote = execSync(`git -C ${localDir} remote get-url origin`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    remote = pkg.repository?.url ?? pkg.homepage ?? null
  }

  const author =
    typeof pkg.author === 'string'
      ? pkg.author
      : pkg.author?.name
        ? `${pkg.author.name}${pkg.author.url ? ` · ${pkg.author.url}` : ''}`
        : '—'

  return {
    name: pkg.name,
    description: pkg.description ?? '',
    version: pkg.version ?? '—',
    author,
    license: pkg.license ?? 'MIT',
    remote,
    homepage: pkg.homepage ?? null,
  }
}
