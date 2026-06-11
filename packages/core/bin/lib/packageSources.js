import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fetchLatestVersion } from './npmVersions.js'
import { desktopMetaDir, fullName, SCOPE, KINDS, inferKind } from './workspace.js'

/**
 * @param {string} githubUser
 * @param {string} pkgShortName
 */
export async function resolveForkUser(githubUser, pkgShortName) {
  if (!githubUser || githubUser === 'owdproject') return 'owdproject'

  try {
    const res = await fetch(`https://api.github.com/repos/${githubUser}/${pkgShortName}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'owd-desktop-cli' },
    })
    if (res.ok) return githubUser
  } catch {
    /* ignore */
  }

  return 'owdproject'
}

/**
 * @param {string} workspaceRoot
 * @param {string} pkgName
 */
function hasLocalWorkspaceSource(workspaceRoot, pkgName) {
  const pkgShort = pkgName.startsWith(SCOPE) ? pkgName.slice(SCOPE.length) : pkgName
  const kind = inferKind(pkgShort)
  return existsSync(join(workspaceRoot, KINDS[kind].workspaceDir, pkgShort, 'package.json'))
}

const CACHE_TTL_MS = 60 * 60 * 1000
const SSH_CACHE_TTL_MS = 15 * 60 * 1000

/**
 * @typedef {{ type: 'npm' } | { type: 'git', protocol: 'https' | 'ssh', owner: string }} InstallSourceChoice
 */

/**
 * @typedef {{
 *   id: string
 *   kind: 'npm' | 'git'
 *   protocol?: 'https' | 'ssh'
 *   owner?: string
 *   label: string
 *   url: string
 *   choice: InstallSourceChoice
 * }} SourceOption
 */

function cachePath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'package-sources.json')
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

function writeCacheFile(workspaceRoot, data) {
  mkdirSync(desktopMetaDir(workspaceRoot), { recursive: true })
  writeFileSync(cachePath(workspaceRoot), JSON.stringify(data, null, 2) + '\n')
}

/**
 * @param {string[] | undefined} githubOrgs
 * @param {string | null | undefined} githubUser
 */
export function trustedPublishers(githubOrgs, githubUser) {
  return [...new Set([...(githubOrgs ?? ['owdproject']), githubUser].filter(Boolean))]
}

/**
 * @param {{ org?: string }} entry
 * @param {{ githubOrgs?: string[], githubUser?: string | null }} settings
 */
export function isTrustedPublisher(entry, settings) {
  if (!entry.org || entry.org === 'workspace') return true
  return trustedPublishers(settings.githubOrgs, settings.githubUser).includes(entry.org)
}

/**
 * @param {string} owner
 * @param {string} shortName
 * @param {'https' | 'ssh'} protocol
 */
export function githubCloneUrl(owner, shortName, protocol) {
  return protocol === 'ssh'
    ? `git@github.com:${owner}/${shortName}.git`
    : `https://github.com/${owner}/${shortName}.git`
}

export function githubHtmlUrl(owner, shortName) {
  return `https://github.com/${owner}/${shortName}`
}

export function npmPackageUrl(pkgName) {
  const short = pkgName.startsWith(SCOPE) ? pkgName.slice(SCOPE.length) : pkgName
  return `https://www.npmjs.com/package/${SCOPE}${short}`
}

/**
 * @param {string} workspaceRoot
 * @param {{ force?: boolean }} [options]
 */
export async function detectGithubSshAuth(workspaceRoot, options = {}) {
  const cache = readCacheFile(workspaceRoot)
  const cached = cache?.sshAuth
  if (!options.force && cached?.checkedAt && Date.now() - cached.checkedAt < SSH_CACHE_TTL_MS) {
    return cached
  }

  /** @type {{ checkedAt: number, available: boolean, githubLogin: string | null, message: string }} */
  let result = {
    checkedAt: Date.now(),
    available: false,
    githubLogin: null,
    message: 'SSH not configured',
  }

  try {
    const out = execSync(
      'ssh -T -o BatchMode=yes -o StrictHostKeyChecking=accept-new git@github.com 2>&1',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000 },
    )
    const text = out || ''
    const login = text.match(/Hi ([^!]+)!/)?.[1]?.trim() ?? null
    if (login) {
      result = {
        checkedAt: Date.now(),
        available: true,
        githubLogin: login,
        message: `authenticated as ${login}`,
      }
    }
  } catch (error) {
    const text = `${error.stdout ?? ''}${error.stderr ?? ''}${error.message ?? ''}`
    const login = text.match(/Hi ([^!]+)!/)?.[1]?.trim() ?? null
    if (login) {
      result = {
        checkedAt: Date.now(),
        available: true,
        githubLogin: login,
        message: `authenticated as ${login}`,
      }
    } else if (/Permission denied|publickey/i.test(text)) {
      result = {
        checkedAt: Date.now(),
        available: false,
        githubLogin: null,
        message: 'SSH keys not accepted by GitHub',
      }
    } else {
      result = {
        checkedAt: Date.now(),
        available: false,
        githubLogin: null,
        message: 'SSH probe failed',
      }
    }
  }

  const next = { ...(cache ?? { fetchedAt: 0, packages: {} }), sshAuth: result }
  writeCacheFile(workspaceRoot, next)
  return result
}

/**
 * @param {string} workspaceRoot
 */
export function getCachedSshAuth(workspaceRoot) {
  const cache = readCacheFile(workspaceRoot)
  return cache?.sshAuth ?? null
}

/**
 * @param {string} shortName
 * @param {{ htmlUrl?: string | null, org?: string }} [catalogEntry]
 * @param {{ githubUser?: string | null }} settings
 */
export async function resolvePackageSources(shortName, settings, workspaceRoot, catalogEntry = {}) {
  const pkgName = fullName(shortName)
  const officialOwner = catalogEntry.org && catalogEntry.org !== 'workspace' ? catalogEntry.org : 'owdproject'
  const officialHtml =
    catalogEntry.htmlUrl ?? githubHtmlUrl(officialOwner, shortName)

  const cache = readCacheFile(workspaceRoot)
  const cachedPkg = cache?.packages?.[shortName]
  const cacheFresh = cachedPkg && cache?.fetchedAt && Date.now() - cache.fetchedAt < CACHE_TTL_MS

  let npm = cachedPkg?.npm ?? null
  if (!cacheFresh || npm === undefined) {
    const version = fetchLatestVersion(pkgName, { optional: true })
    npm = version ? { version } : null
  }

  let forkOwner = settings.githubUser && settings.githubUser !== 'owdproject' ? settings.githubUser : null
  let forkExists = false
  if (forkOwner) {
    const resolved = await resolveForkUser(forkOwner, shortName)
    forkExists = resolved === forkOwner
  }

  const local = workspaceRoot && hasLocalWorkspaceSource(workspaceRoot, pkgName)

  const metadata = {
    shortName,
    pkgName,
    npm,
    github: {
      official: {
        owner: officialOwner,
        htmlUrl: officialHtml,
        exists: Boolean(catalogEntry.htmlUrl || officialOwner),
      },
      fork: forkOwner
        ? { owner: forkOwner, exists: forkExists, htmlUrl: githubHtmlUrl(forkOwner, shortName) }
        : null,
    },
    local: local ? true : false,
  }

  const packages = { ...(cache?.packages ?? {}), [shortName]: { npm, github: metadata.github } }
  writeCacheFile(workspaceRoot, {
    fetchedAt: Date.now(),
    sshAuth: cache?.sshAuth ?? null,
    packages,
  })

  return metadata
}

/**
 * @param {Awaited<ReturnType<typeof resolvePackageSources>>} metadata
 * @param {{ githubUser?: string | null }} settings
 * @param {{ available?: boolean }} sshAuth
 * @returns {SourceOption[]}
 */
export function buildSourceOptions(metadata, settings, sshAuth = {}) {
  /** @type {SourceOption[]} */
  const options = []

  if (metadata.npm?.version) {
    options.push({
      id: 'npm',
      kind: 'npm',
      label: `npm ${metadata.pkgName} ${metadata.npm.version}`,
      url: npmPackageUrl(metadata.pkgName),
      choice: { type: 'npm' },
    })
  }

  const official = metadata.github.official
  if (official?.owner) {
    options.push({
      id: 'git-https-official',
      kind: 'git',
      protocol: 'https',
      owner: official.owner,
      label: `GitHub HTTPS — ${official.owner}/${metadata.shortName}`,
      url: githubCloneUrl(official.owner, metadata.shortName, 'https'),
      choice: { type: 'git', protocol: 'https', owner: official.owner },
    })
    if (sshAuth.available) {
      options.push({
        id: 'git-ssh-official',
        kind: 'git',
        protocol: 'ssh',
        owner: official.owner,
        label: `GitHub SSH — ${official.owner}/${metadata.shortName}`,
        url: githubCloneUrl(official.owner, metadata.shortName, 'ssh'),
        choice: { type: 'git', protocol: 'ssh', owner: official.owner },
      })
    }
  }

  const fork = metadata.github.fork
  if (fork?.exists && fork.owner) {
    options.push({
      id: 'git-https-fork',
      kind: 'git',
      protocol: 'https',
      owner: fork.owner,
      label: `GitHub HTTPS — ${fork.owner}/${metadata.shortName} (your fork)`,
      url: githubCloneUrl(fork.owner, metadata.shortName, 'https'),
      choice: { type: 'git', protocol: 'https', owner: fork.owner },
    })
    if (sshAuth.available) {
      options.push({
        id: 'git-ssh-fork',
        kind: 'git',
        protocol: 'ssh',
        owner: fork.owner,
        label: `GitHub SSH — ${fork.owner}/${metadata.shortName} (your fork)`,
        url: githubCloneUrl(fork.owner, metadata.shortName, 'ssh'),
        choice: { type: 'git', protocol: 'ssh', owner: fork.owner },
      })
    }
  } else if (settings.githubUser && settings.githubUser !== 'owdproject' && !fork?.exists) {
    options.push({
      id: 'git-https-fork-missing',
      kind: 'git',
      protocol: 'https',
      owner: settings.githubUser,
      label: `GitHub HTTPS — ${settings.githubUser}/${metadata.shortName} (fork not found — may fail)`,
      url: githubCloneUrl(settings.githubUser, metadata.shortName, 'https'),
      choice: { type: 'git', protocol: 'https', owner: settings.githubUser },
    })
  }

  return options
}

/**
 * @param {object[]} entries
 * @param {string} workspaceRoot
 * @param {{ githubOrgs?: string[], githubUser?: string | null }} settings
 */
export async function enrichCatalogEntries(entries, workspaceRoot, settings) {
  const cache = readCacheFile(workspaceRoot)
  const sshAuth = await detectGithubSshAuth(workspaceRoot)
  const shortNames = entries.map((e) => e.shortName)
  const missingNpm = shortNames.filter((s) => !cache?.packages?.[s]?.npm)

  if (missingNpm.length > 0) {
    const packages = { ...(cache?.packages ?? {}) }
    for (const shortName of missingNpm.slice(0, 40)) {
      const version = fetchLatestVersion(fullName(shortName), { optional: true })
      packages[shortName] = {
        ...(packages[shortName] ?? {}),
        npm: version ? { version } : null,
      }
    }
    writeCacheFile(workspaceRoot, {
      fetchedAt: Date.now(),
      sshAuth: cache?.sshAuth ?? sshAuth,
      packages,
    })
  }

  const freshCache = readCacheFile(workspaceRoot)
  return entries.map((entry) => {
    const pkgMeta = freshCache?.packages?.[entry.shortName]
    return {
      ...entry,
      trusted: isTrustedPublisher(entry, settings),
      sourcesMeta: {
        npm: pkgMeta?.npm ?? null,
        github: {
          official: {
            owner: entry.org && entry.org !== 'workspace' ? entry.org : 'owdproject',
            htmlUrl: entry.htmlUrl ?? githubHtmlUrl(entry.org ?? 'owdproject', entry.shortName),
          },
        },
      },
    }
  })
}

/**
 * @param {{ sourcesMeta?: { npm?: { version?: string } | null }, localSource?: boolean, htmlUrl?: string, trusted?: boolean }} item
 */
export function formatSourceBadges(item) {
  const parts = []
  if (item.localSource) parts.push(`{cyan-fg}l{/}`)
  if (item.sourcesMeta?.npm?.version) parts.push(`{green-fg}n{/}`)
  if (item.htmlUrl || item.sourcesMeta?.github) parts.push(`{blue-fg}g{/}`)
  if (item.trusted === false) parts.push(`{yellow-fg}!{/}`)
  return parts.length ? ` ${parts.join('')}` : ''
}
