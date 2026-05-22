import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'
import {
  resolveDesktopConfigPath,
  desktopConfigWritePath,
} from './desktopConfig.js'

export const SCOPE = '@owdproject/'

/** Not loadable via desktop.config `modules` (core is the shell). */
export const DESKTOP_NON_INSTALLABLE = new Set([
  '@owdproject/core',
])

/** Installed documentation modules (current + deprecated package name). */
export const DOCS_MODULE_PACKAGES = [
  '@owdproject/module-docs',
  '@owdproject/docs',
]

export function hasDocsModuleInstalled(config, deps = {}) {
  return DOCS_MODULE_PACKAGES.some(
    (name) => config?.modules?.includes(name) || deps[name],
  )
}

export function docsBasePathFromConfig(config) {
  const base = config?.docs?.basePath
  if (typeof base === 'string' && base.startsWith('/')) return base
  return '/docs'
}

/** Theme-internal UI kits — pulled in by themes, not listed as desktop modules. */
export function isDesktopKitPackage(pkgName) {
  const short = pkgName.startsWith(SCOPE) ? pkgName.slice(SCOPE.length) : pkgName
  return short.startsWith('kit-')
}

/** Scaffold / blueprint packages — not loadable desktop modules. */
export function isDesktopTemplatePackage(pkgName) {
  const short = pkgName.startsWith(SCOPE) ? pkgName.slice(SCOPE.length) : pkgName
  return short.endsWith('-template')
}

export function isInstallableDesktopModule(pkgName) {
  return (
    !DESKTOP_NON_INSTALLABLE.has(pkgName) &&
    !isDesktopKitPackage(pkgName) &&
    !isDesktopTemplatePackage(pkgName)
  )
}

export const KINDS = {
  app: {
    label: 'Apps',
    topic: 'owd-apps',
    workspaceDir: 'apps',
    configKey: 'apps',
    nx: 'desktop:install-app',
  },
  module: {
    label: 'Modules',
    topic: 'owd-modules',
    workspaceDir: 'packages',
    configKey: 'modules',
    nx: 'desktop:install-module',
  },
  theme: {
    label: 'Themes',
    topic: 'owd-themes',
    workspaceDir: 'themes',
    configKey: 'theme',
    nx: 'desktop:install-theme',
  },
}

export function findWorkspaceRoot(startDir = process.cwd()) {
  let dir = startDir
  for (;;) {
    if (
      existsSync(join(dir, 'pnpm-workspace.yaml')) &&
      existsSync(join(dir, 'nx.json'))
    ) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function desktopMetaDir(workspaceRoot) {
  return join(workspaceRoot, '.desktop')
}

export function settingsPath(workspaceRoot) {
  return join(desktopMetaDir(workspaceRoot), 'settings.json')
}

/** @typedef {'npm' | 'workspace'} InstallMode */

export function normalizeInstallMode(value) {
  if (value === 'workspace' || value === 'dev') return 'workspace'
  return 'npm'
}

export function isWorkspaceInstallMode(settings) {
  return normalizeInstallMode(settings?.installMode) === 'workspace'
}

export function loadSettings(workspaceRoot) {
  const defaults = {
    devPort: 3000,
    githubUser: null,
    githubOrgs: ['owdproject'],
    installMode: /** @type {InstallMode} */ ('npm'),
  }

  try {
    const path = settingsPath(workspaceRoot)
    if (!existsSync(path)) {
      return { ...defaults, ...detectGithubUser(), installMode: 'npm' }
    }
    const merged = { ...defaults, ...detectGithubUser(), ...JSON.parse(readFileSync(path, 'utf8')) }
    merged.installMode = normalizeInstallMode(merged.installMode)
    return merged
  } catch {
    return { ...defaults, ...detectGithubUser(), installMode: 'npm' }
  }
}

function detectGithubUser() {
  const fromEnv = process.env.OWD_GITHUB_USER?.trim()
  if (fromEnv) return { githubUser: fromEnv }

  try {
    const user = execSync('git config --get github.user || git config --get user.username', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (user) return { githubUser: user }
  } catch {
    /* ignore */
  }

  return {}
}

export function saveSettings(workspaceRoot, settings) {
  const dir = desktopMetaDir(workspaceRoot)
  mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath(workspaceRoot), JSON.stringify(settings, null, 2) + '\n')
}

export function desktopPaths(workspaceRoot) {
  const desktop = join(workspaceRoot, 'desktop')
  const resolved = resolveDesktopConfigPath(desktop)
  const configWrite = desktopConfigWritePath(desktop)

  return {
    desktop,
    config: resolved?.path ?? configWrite,
    configWrite,
    configLegacy: resolved?.legacy ?? false,
    packageJson: join(desktop, 'package.json'),
  }
}

export function shortName(pkgName) {
  return pkgName.startsWith(SCOPE) ? pkgName.slice(SCOPE.length) : pkgName
}

export function fullName(short) {
  return short.startsWith(SCOPE) ? short : `${SCOPE}${short}`
}

export function inferKind(shortName) {
  if (shortName.startsWith('app-')) return 'app'
  if (shortName.startsWith('theme-')) return 'theme'
  return 'module'
}
