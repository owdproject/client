import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'

export const SCOPE = '@owdproject/'

/** Not loadable via owd.config `modules` (core is the shell; docs is internal). */
export const DESKTOP_NON_INSTALLABLE = new Set([
  '@owdproject/core',
  '@owdproject/docs',
])

export function isInstallableDesktopModule(pkgName) {
  return !DESKTOP_NON_INSTALLABLE.has(pkgName)
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

export function owdDir(workspaceRoot) {
  return join(workspaceRoot, '.owd')
}

export function settingsPath(workspaceRoot) {
  return join(owdDir(workspaceRoot), 'settings.json')
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
  const dir = owdDir(workspaceRoot)
  mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath(workspaceRoot), JSON.stringify(settings, null, 2) + '\n')
}

export function desktopPaths(workspaceRoot) {
  return {
    desktop: join(workspaceRoot, 'desktop'),
    config: join(workspaceRoot, 'desktop', 'owd.config.ts'),
    packageJson: join(workspaceRoot, 'desktop', 'package.json'),
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
