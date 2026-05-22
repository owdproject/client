import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { desktopMetaDir } from './workspace.js'

const CACHE_TTL_MS = 60 * 60 * 1000
const SCOPE = '@owdproject/'

/**
 * @param {string} version
 */
export function formatCaretVersion(version) {
  const trimmed = String(version).trim()
  if (!trimmed) throw new Error('Invalid npm version (empty)')
  if (trimmed.startsWith('^') || trimmed.startsWith('~') || trimmed.startsWith('>=')) {
    return trimmed
  }
  return `^${trimmed}`
}

/**
 * @param {string} pkgName
 */
export function fetchLatestVersion(pkgName) {
  let out
  try {
    out = execSync(`npm view ${JSON.stringify(pkgName)} version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const msg = error.stderr?.toString?.() || error.message || String(error)
    throw new Error(`npm view failed for ${pkgName}: ${msg}`)
  }
  return formatCaretVersion(out)
}

/**
 * @param {string[]} pkgNames
 * @returns {Record<string, string>}
 */
export function fetchLatestVersions(pkgNames) {
  const unique = [...new Set(pkgNames.filter(Boolean))]
  if (unique.length === 0) return {}

  if (unique.length === 1) {
    return { [unique[0]]: fetchLatestVersion(unique[0]) }
  }

  let raw
  try {
    raw = execSync(`npm view ${unique.map((p) => JSON.stringify(p)).join(' ')} version --json`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const msg = error.stderr?.toString?.() || error.message || String(error)
    throw new Error(`npm view batch failed: ${msg}`)
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = raw
  }

  /** @type {Record<string, string>} */
  const result = {}

  if (typeof parsed === 'string') {
    result[unique[0]] = formatCaretVersion(parsed)
    for (let i = 1; i < unique.length; i++) {
      result[unique[i]] = fetchLatestVersion(unique[i])
    }
    return result
  }

  if (Array.isArray(parsed)) {
    unique.forEach((name, i) => {
      result[name] = formatCaretVersion(parsed[i])
    })
    return result
  }

  for (const name of unique) {
    const version = parsed[name]
    if (version == null) {
      result[name] = fetchLatestVersion(name)
    } else {
      result[name] = formatCaretVersion(String(version))
    }
  }

  return result
}

function cachePath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'template-versions.json')
}

/**
 * @param {string} workspaceRoot
 * @param {string[]} pkgNames
 * @param {{ useCache?: boolean }} [options]
 */
export function resolveLatestVersions(workspaceRoot, pkgNames, options = {}) {
  const useCache = options.useCache !== false
  const unique = [...new Set(pkgNames.filter(Boolean))]
  const path = cachePath(workspaceRoot)

  if (useCache && existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf8'))
      if (Date.now() - data.fetchedAt < CACHE_TTL_MS && data.versions) {
        const cached = data.versions
        const missing = unique.filter((name) => !cached[name])
        if (missing.length === 0) {
          return Object.fromEntries(unique.map((name) => [name, cached[name]]))
        }
        const fresh = fetchLatestVersions(missing)
        const merged = { ...cached, ...fresh }
        writeVersionCache(workspaceRoot, merged)
        return Object.fromEntries(unique.map((name) => [name, merged[name]]))
      }
    } catch {
      /* ignore corrupt cache */
    }
  }

  const versions = fetchLatestVersions(unique)
  if (useCache) writeVersionCache(workspaceRoot, versions)
  return versions
}

/**
 * @param {string} workspaceRoot
 * @param {Record<string, string>} versions
 */
export function writeVersionCache(workspaceRoot, versions) {
  mkdirSync(desktopMetaDir(workspaceRoot), { recursive: true })
  writeFileSync(
    cachePath(workspaceRoot),
    JSON.stringify({ fetchedAt: Date.now(), versions }, null, 2) + '\n',
  )
}

/**
 * @param {string} pkgName
 */
export function isOwdScopedPackage(pkgName) {
  return pkgName.startsWith(SCOPE)
}
