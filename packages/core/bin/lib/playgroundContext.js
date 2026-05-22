import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { SCOPE } from './workspace.js'

const PLAYGROUND_CONFIG = join('playground', 'desktop.config.ts')

/**
 * @param {string} dir
 * @returns {boolean}
 */
export function hasPlaygroundDesktopConfig(dir) {
  return (
    existsSync(join(dir, 'playground')) &&
    existsSync(join(dir, PLAYGROUND_CONFIG))
  )
}

/**
 * @param {string} pkgPath
 * @returns {{ name: string } | null}
 */
function readOwdPackageJson(pkgPath) {
  if (!existsSync(pkgPath)) return null
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (typeof pkg.name === 'string' && pkg.name.startsWith(SCOPE)) {
      return { name: pkg.name }
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Walk up from cwd until a package.json with @owdproject/* name and a playground
 * with desktop.config.ts is found.
 *
 * @param {string} [startDir]
 * @returns {string | null} Absolute package directory
 */
export function findOwdModulePackageRoot(startDir = process.cwd()) {
  let dir = resolve(startDir)
  for (;;) {
    const meta = readOwdPackageJson(join(dir, 'package.json'))
    if (meta && hasPlaygroundDesktopConfig(dir)) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * @param {string} path
 * @param {string} root
 */
function isPathInside(path, root) {
  const normalized = resolve(path)
  const base = resolve(root)
  return normalized === base || normalized.startsWith(base + sep)
}

/**
 * @typedef {'workspace' | 'playground'} DevTargetMode
 */

/**
 * @typedef {object} DevTarget
 * @property {DevTargetMode} mode
 * @property {string} workspaceRoot
 * @property {string} packageDir Directory where `pnpm run dev` runs
 * @property {string | null} packageName Set when mode is playground
 * @property {string | null} playgroundDir Absolute path to playground/
 */

/**
 * @param {string} packageDir
 * @param {string} workspaceRoot
 * @param {string} packageName
 * @returns {DevTarget}
 */
function playgroundTarget(packageDir, workspaceRoot, packageName) {
  return {
    mode: 'playground',
    workspaceRoot,
    packageDir: resolve(packageDir),
    packageName,
    playgroundDir: join(resolve(packageDir), 'playground'),
  }
}

/**
 * @param {string} workspaceRoot
 * @returns {DevTarget}
 */
function workspaceTarget(workspaceRoot) {
  return {
    mode: 'workspace',
    workspaceRoot: resolve(workspaceRoot),
    packageDir: resolve(workspaceRoot),
    packageName: null,
    playgroundDir: null,
  }
}

/**
 * Resolve whether the CLI/TUI should start the monorepo desktop shell or a
 * module package playground dev server.
 *
 * @param {string} [cwd]
 * @param {string | null} workspaceRoot
 * @param {{ forcePlayground?: boolean }} [options]
 * @returns {DevTarget | null} null when workspaceRoot is missing
 */
export function resolveDevTarget(cwd, workspaceRoot, options = {}) {
  if (!workspaceRoot) return null

  const normalizedCwd = resolve(cwd ?? process.cwd())
  const root = resolve(workspaceRoot)
  const desktopDir = join(root, 'desktop')
  const packageRoot = findOwdModulePackageRoot(normalizedCwd)
  const forcePlayground = options.forcePlayground === true

  if (packageRoot) {
    const meta = readOwdPackageJson(join(packageRoot, 'package.json'))
    const packageName = meta?.name ?? null

    if (forcePlayground) {
      return playgroundTarget(packageRoot, root, packageName)
    }

    const atWorkspaceRoot = normalizedCwd === root
    const underDesktopOnly =
      isPathInside(normalizedCwd, desktopDir) && !isPathInside(normalizedCwd, packageRoot)

    if (!atWorkspaceRoot && !underDesktopOnly && isPathInside(normalizedCwd, packageRoot)) {
      return playgroundTarget(packageRoot, root, packageName)
    }
  }

  if (forcePlayground) {
    return null
  }

  return workspaceTarget(root)
}

/**
 * @param {DevTarget | string | null | undefined} target
 * @param {string} [workspaceRoot]
 * @returns {DevTarget | null}
 */
export function normalizeDevTarget(target, workspaceRoot) {
  if (!target) return workspaceRoot ? workspaceTarget(workspaceRoot) : null
  if (typeof target === 'string') return workspaceTarget(target)
  if (target.mode && target.workspaceRoot) return target
  if (workspaceRoot) {
    return {
      ...workspaceTarget(workspaceRoot),
      ...target,
      workspaceRoot: resolve(workspaceRoot),
    }
  }
  return null
}

/**
 * @param {DevTarget | string} target
 * @returns {string}
 */
export function devSpawnCwd(target) {
  const resolved = typeof target === 'string' ? workspaceTarget(target) : target
  return resolved.packageDir
}

/**
 * @param {DevTarget | string} target
 * @returns {string}
 */
export function devTargetLogLabel(target) {
  const resolved = typeof target === 'string' ? workspaceTarget(target) : target
  if (resolved.mode === 'playground' && resolved.packageName) {
    return `playground ${resolved.packageName}`
  }
  return 'workspace desktop'
}
