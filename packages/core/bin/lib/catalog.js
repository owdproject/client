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

const CACHE_TTL_MS = 60 * 60 * 1000

function cachePath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'catalog-cache.json')
}

function readCache(workspaceRoot) {
  const path = cachePath(workspaceRoot)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null
    const ageMin = Math.round((Date.now() - data.fetchedAt) / 60_000)
    return { entries: data.entries, cacheAge: `${ageMin}m` }
  } catch {
    return null
  }
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
  return (json.items ?? []).map((repo) => ({
    shortName: repo.name,
    description: repo.description ?? '',
    stars: repo.stargazers_count ?? 0,
    htmlUrl: repo.html_url,
    org: repo.owner?.login ?? org,
    kind: inferKind(repo.name),
  }))
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
    .map((repo) => ({
      shortName: repo.name,
      description: repo.description ?? '',
      stars: repo.stargazers_count ?? 0,
      htmlUrl: repo.html_url,
      org: repo.owner?.login ?? user,
      kind: inferKind(repo.name),
    }))
}

function scanLocal(workspaceRoot, kind) {
  const dir = join(workspaceRoot, KINDS[kind].workspaceDir)
  if (!existsSync(dir)) return []

  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const pkgPath = join(dir, d.name, 'package.json')
      if (!existsSync(pkgPath)) return null
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        if (!pkg.name?.startsWith(SCOPE)) return null
        let remote = null
        try {
          remote = execSync(`git -C ${join(dir, d.name)} remote get-url origin`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim()
        } catch {
          /* no git */
        }
        return {
          shortName: shortName(pkg.name),
          description: pkg.description ?? '',
          stars: 0,
          htmlUrl: pkg.homepage ?? pkg.repository?.url ?? null,
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

export async function loadCatalog(workspaceRoot, settings) {
  const cached = readCache(workspaceRoot)
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
      const at = Date.now()
      writeCache(workspaceRoot, remote)
      cacheAge = formatCacheAge(at)
    }
  }

  const byName = new Map()

  for (const item of remote) {
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
          remote: item.remote ?? prev.htmlUrl,
          sources: [...new Set([...(prev.sources ?? []), 'workspace'])],
        })
      } else {
        byName.set(item.shortName, { ...item, sources: ['workspace'] })
      }
    }
  }

  const entries = [...byName.values()].map((entry) => ({
    ...entry,
    name: fullName(entry.shortName),
    kind: entry.kind ?? inferKind(entry.shortName),
  }))

  return {
    entries,
    cacheAge: cacheAge ?? 'live',
  }
}

export function filterCatalog(catalog, kind) {
  return catalog
    .filter((e) => e.kind === kind)
    .filter((e) => kind !== 'module' || isInstallableDesktopModule(e.name))
    .sort((a, b) => {
      if (a.org === 'workspace' && b.org !== 'workspace') return -1
      if (b.org === 'workspace' && a.org !== 'workspace') return 1
      return (b.stars ?? 0) - (a.stars ?? 0) || a.shortName.localeCompare(b.shortName)
    })
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
