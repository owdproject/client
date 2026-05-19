import { spawn } from 'node:child_process'
import { runDevForeground } from './lib/status.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import getopts from 'getopts'
import {
  resolveSource,
  printPlan,
  printNextSteps,
  runWorkspaceInstall,
  runNpmInstall,
} from './lib/install.js'
import { findWorkspaceRoot, inferKind } from './lib/workspace.js'
import { scaffoldProject } from './lib/scaffold.js'

const SCOPE = '@owdproject/'

/** @type {Record<string, { configKey: string, workspaceDir: string, nx: string, label: string }>} */
const KINDS = {
  app: {
    label: 'app',
    configKey: 'apps',
    workspaceDir: 'apps',
    nx: 'desktop:install-app',
  },
  module: {
    label: 'module',
    configKey: 'modules',
    workspaceDir: 'packages',
    nx: 'desktop:install-module',
  },
  theme: {
    label: 'theme',
    configKey: 'theme',
    workspaceDir: 'themes',
    nx: 'desktop:install-theme',
  },
}

const LEGACY_COMMANDS = {
  'install-app': 'app',
  'install-module': 'module',
  'install-theme': 'theme',
}

/** @type {string} */
let commandName = 'desktop'

function buildHelp(name) {
  return `
${name} — add apps, modules, and themes to your Open Web Desktop

USAGE
  ${name}                 Start the dev server (pnpm run dev)
  ${name} init [dir]      Create a new OWD project (then opens desktop ui)
  ${name} ui              Interactive dashboard (btop-style TUI)
  ${name} add <package> [options]
  ${name} add <kind> <name> [options]

INSTALL MODES
  User (default)        npm registry — for end users and generated projects
  Dev                   clone into apps/, packages/, or themes/ in the monorepo

EXAMPLES
  pnpm ${name}            # dev server
  ${name} init my-desktop # scaffold + pnpm install + control panel
  pnpm ${name} ui         # control panel
  ${name} add app-todo --npm
  ${name} add app-todo --dev
  ${name} add module-persistence --from dxlliv

KINDS (optional — inferred from the package name)
  app       app-*     → apps/
  module    module-*, kit-*  → packages/
  theme     theme-*   → themes/

OPTIONS
  --from <source>   Git source (user, user/repo, or URL)
  --branch <name>   Git branch to clone
  --npm             Install from npm (default when --from is omitted)
  --dev, --workspace  Clone from github.com/owdproject/<package>
  --dry-run         Print the plan without changing anything
  -h, --help        Show this help

--from <source>
  (omit)          npm registry (default)
  npm             npm registry
  owdproject      Clone official repo (monorepo only)
  <github-user>   Clone github.com/<user>/<package> (your fork)
  <user>/<repo>   Explicit GitHub repo
  <git-url>       Full clone URL

LEGACY (still supported)
  ${name} install-app @owdproject/app-todo
  → prefer: ${name} add app-todo
`
}

function fail(message, hint) {
  console.error(`\n✗ ${message}`)
  if (hint) console.error(`  ${hint}`)
  console.error(`\nRun \`${commandName} --help\` for usage.\n`)
  process.exit(1)
}

function warn(message) {
  console.warn(`\n⚠ ${message}\n`)
}

/**
 * @param {string} input
 * @param {string | undefined} explicitKind
 */
function normalizePackage(input, explicitKind) {
  let raw = input.trim()
  if (raw.startsWith(SCOPE)) raw = raw.slice(SCOPE.length)

  if (!raw) {
    fail('Package name is required.', `Example: ${commandName} add app-todo`)
  }

  const kind = explicitKind ?? inferKind(raw)

  if (explicitKind) {
    const prefixes = {
      app: 'app-',
      theme: 'theme-',
      module: ['module-', 'kit-'],
    }
    const expected = prefixes[explicitKind]
    const list = Array.isArray(expected) ? expected : [expected]
    if (!list.some((p) => raw.startsWith(p))) {
      raw = `${list[0]}${raw}`
    }
  }

  return { pkgName: `${SCOPE}${raw}`, shortName: raw, kind }
}

function mapLegacyFlags(parsed) {
  const { dev, workspace, fork, repo, branch, from, npm } = parsed
  let mappedFrom = from
  let mappedNpm = npm
  const forceDev = dev || workspace

  if (fork || repo) {
    warn('`--fork` and `--repo` are deprecated — use `--from` instead.')
    mappedFrom = repo || fork
  }
  if (forceDev && !mappedFrom && !mappedNpm) {
    mappedFrom = 'owdproject'
  }
  if (mappedNpm) mappedFrom = 'npm'

  return { from: mappedFrom, branch, npm: mappedNpm, dev: forceDev }
}

function parseAddArgs(positionals) {
  const kindNames = Object.keys(KINDS)
  if (positionals.length === 0) {
    fail('Missing package name.', `Example: ${commandName} add app-todo`)
  }

  if (kindNames.includes(positionals[0])) {
    const kind = positionals[0]
    const name = positionals[1]
    if (!name) {
      fail(`Missing name for kind "${kind}".`, `Example: ${commandName} add ${kind} todo`)
    }
    return normalizePackage(name, kind)
  }

  return normalizePackage(positionals[0])
}

function parseLegacyInstall(cmd, positionals) {
  const kind = LEGACY_COMMANDS[cmd]
  const raw = positionals[0]
  if (!raw) {
    fail('Missing package name.', `Example: ${commandName} ${cmd} ${SCOPE}app-todo`)
  }
  warn(`\`${cmd}\` is deprecated — use \`${commandName} add …\` instead.`)
  return normalizePackage(raw, kind)
}

/**
 * @param {string} name CLI binary name (`desktop` or deprecated `owd`)
 * @param {string[]} argv Arguments (without node and script path)
 * @param {{ deprecated?: boolean }} [options]
 */
export async function runCli(name, argv, options = {}) {
  commandName = name

  if (options.deprecated) {
    warn('The `owd` command is deprecated. Use `desktop` instead.')
  }

  const parsed = getopts(argv, {
    alias: { h: 'help', b: 'branch' },
    boolean: ['help', 'npm', 'dry-run', 'dev', 'workspace'],
    string: ['from', 'branch', 'fork', 'repo'],
  })

  const { _, help, npm: npmFlag } = parsed
  const dryRun = parsed['dry-run'] === true
  const { from, branch, npm: npmFromLegacy, dev: devFlag } = mapLegacyFlags(parsed)
  const useNpm = npmFlag || npmFromLegacy || (!from && !devFlag)

  if (help || _[0] === 'help') {
    console.log(buildHelp(name))
    process.exit(0)
  }

  const cmd = _[0]

  if (cmd === 'init') {
    const projectDir = (_[1] || 'owd-client').trim()
    const cwd = process.cwd()

    if (findWorkspaceRoot(cwd)) {
      fail(
        'Already inside an OWD workspace.',
        `Use \`${name} ui\` to manage this project, or run init from a parent directory.`,
      )
    }

    try {
      await scaffoldProject({ dir: projectDir, cwd, commandName: name })
    } catch (error) {
      fail(error.message ?? String(error))
    }
    return
  }

  const workspaceRoot = findWorkspaceRoot()

  if (!cmd) {
    if (!workspaceRoot) {
      fail(
        'Not inside an OWD workspace.',
        'Run from the client repo, or try: desktop ui · desktop add <package>',
      )
    }
    runDevForeground(workspaceRoot)
    return
  }

  if (!workspaceRoot) {
    fail(
      'Not inside an OWD workspace.',
      'Run from the client repo (needs pnpm-workspace.yaml + nx.json), or use a generated project with the same layout.',
    )
  }

  let pkgInfo

  if (cmd === 'ui') {
    const { runTui } = await import('./tui.js')
    await runTui(name)
    return
  }

  if (cmd === 'add') {
    pkgInfo = parseAddArgs(_.slice(1))
  } else if (LEGACY_COMMANDS[cmd]) {
    pkgInfo = parseLegacyInstall(cmd, _.slice(1))
  } else {
    fail(`Unknown command: ${cmd}`, `Use \`${name} ui\` or \`${name} add <package>\`.`)
  }

  const { pkgName, shortName, kind } = pkgInfo
  const inMonorepo = Boolean(workspaceRoot)
  const source = resolveSource(useNpm ? 'npm' : from, shortName, inMonorepo, {
    npm: useNpm,
    dev: devFlag,
  })

  if (source.mode === 'npm') {
    if (dryRun) {
      printPlan({
        pkgName,
        kind,
        targetDir: '(npm → node_modules)',
        source,
        branch: null,
        dryRun: true,
      })
      process.exit(0)
    }
    runNpmInstall(kind, pkgName, workspaceRoot)
  } else {
    try {
      await runWorkspaceInstall({
        pkgName,
        shortName,
        kind,
        workspaceRoot,
        source,
        branch,
        dryRun,
      })
    } catch (error) {
      fail(error.message ?? String(error))
    }
  }
}
