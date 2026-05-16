import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'

export const SCOPE = '@owdproject/'

export const KINDS = {
  app: { label: 'Apps', topic: 'owd-apps', workspaceDir: 'apps', configKey: 'apps' },
  module: {
    label: 'Modules',
    topic: 'owd-modules',
    workspaceDir: 'packages',
    configKey: 'modules',
  },
  theme: {
    label: 'Themes',
    topic: 'owd-themes',
    workspaceDir: 'themes',
    configKey: 'theme',
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

export function loadSettings(workspaceRoot) {
  const defaults = {
    devPort: 3000,
    githubUser: null,
    githubOrgs: ['owdproject'],
  }

  try {
    const path = settingsPath(workspaceRoot)
    if (!existsSync(path)) return { ...defaults, ...detectGithubUser() }
    return { ...defaults, ...detectGithubUser(), ...JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { ...defaults, ...detectGithubUser() }
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
