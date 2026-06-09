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
import { resolveDevTarget } from './lib/playgroundContext.js'
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
  ${name}                 Open the control panel (interactive TUI)
  ${name} dev [--playground]  Start dev server (auto-detects module playground)

CONTROL PANEL (TUI)
  m                       Open command menu (all actions)
  s                       Start the Nuxt dev server
  x                       Stop the Nuxt dev server
  R                       Reboot the Nuxt dev server (stop + start)
  w                       Save catalog/theme changes to desktop.config.ts
  1 / 2                   Apps / Modules catalog tabs (Modules default)
  o                       Cycle catalog sort (updated, name, stars, installed)
  t                       Pick theme (inline overlay)
  i                       Open in-app docs (when module-docs is installed)
  d                       Install mode panel (USER/DEV); Enter toggles inside panel
  g                       Settings (GitHub username for fork clones)
  r                       Refresh package list from GitHub (detects new modules)
  b                       Run pnpm run generate
  q / Esc                 Quit
  ${name} init [dir]      Create a new OWD project (then opens the control panel)
  ${name} add <package> [options]
  ${name} add <kind> <name> [options]
  ${name} validate [path...]  Check Nuxt module + playground layout
  ${name} template [--dry-run] [--check]  Regenerate client/template/ (maintainers)

TEMPLATE (monorepo maintainers)
  ${name} template              Write template/ from blueprint + desktop/ + latest npm versions
  ${name} template --dry-run    Show planned @owdproject/* and starter versions
  ${name} template --check      Fail if committed template/ differs (CI)

VALIDATE
  ${name} validate            Validate cwd package, or all apps/themes/modules at repo root
  ${name} validate .          Validate explicit package directory
  ${name} validate apps       Validate every @owdproject/* module under apps/
  --json                      Machine-readable output
  --strict                    Treat warnings as failures
  --smoke                     Run dev:prepare + nuxt build playground (slow, CI)

INSTALL MODES
  User (default)        npm registry — for end users and generated projects
  Dev                   clone into apps/, packages/, or themes/ in the monorepo

EXAMPLES
  pnpm ${name}            # control panel
  pnpm ${name} dev        # monorepo desktop (from repo root)
  cd apps/app-about && pnpm ${name} dev   # app-about playground
  pnpm ${name} dev --playground           # force playground when cwd is in a module
  ${name} init my-desktop # scaffold + pnpm install + control panel
  ${name} add app-todo --npm
  ${name} add app-todo --dev
  ${name} add module-persistence --from dxlliv

KINDS (optional — inferred from the package name)
  app       app-*     → apps/
  module    module-*  → packages/  (kit-* and *-template are not listed in the control panel)
  theme     theme-*   → themes/

OPTIONS
  --playground      Start the module playground dev server (when cwd is inside an @owdproject/* package with playground/)
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

async function openControlPanel(name) {
  const { runTui } = await import('./tui.js')
  await runTui(name)
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
    boolean: ['help', 'npm', 'dry-run', 'dev', 'workspace', 'playground', 'json', 'strict', 'smoke', 'check'],
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
        `Use \`${name}\` to manage this project, or run init from a parent directory.`,
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

  if (cmd === 'dev') {
    if (!workspaceRoot) {
      fail(
        'Not inside an OWD workspace.',
        'Run from the client repo, or try: desktop · desktop add <package>',
      )
    }
    const forcePlayground = parsed.playground === true
    const devTarget = resolveDevTarget(process.cwd(), workspaceRoot, { forcePlayground })
    if (forcePlayground && !devTarget) {
      fail(
        'No @owdproject module with playground/desktop.config.ts found from this directory.',
        'Run from an app/theme/module package (e.g. apps/app-about), or omit --playground for the monorepo desktop.',
      )
    }
    runDevForeground(devTarget)
    return
  }

  if (cmd === 'validate') {
    const { runValidateCli, formatValidationReport } = await import('./lib/validateModule.js')
    const strict = parsed.strict === true
    const json = parsed.json === true
    const smoke = parsed.smoke === true
    const paths = _.slice(1).map(String)
    const { exitCode, results } = runValidateCli(paths, {
      workspaceRoot,
      json,
      strict,
      smoke,
    })
    for (const result of results) {
      console.log(formatValidationReport(result, { json }))
      if (!json) console.log('')
    }
    process.exit(exitCode)
  }

  if (cmd === 'template') {
    if (!workspaceRoot) {
      fail(
        'Not inside an OWD workspace.',
        `Run from the client monorepo root to regenerate template/.`,
      )
    }
    const { runGenerateTemplateCli } = await import('./lib/generateTemplate.js')
    await runGenerateTemplateCli({
      workspaceRoot,
      dryRun: parsed['dry-run'] === true,
      check: parsed.check === true,
    })
    return
  }

  if (!cmd) {
    if (!workspaceRoot) {
      fail(
        'Not inside an OWD workspace.',
        'Run from the client repo, or try: desktop · desktop add <package>',
      )
    }
    await openControlPanel(name)
    return
  }

  if (cmd === 'ui') {
    fail('The `ui` subcommand was removed.', `Use \`${name}\` to open the control panel.`)
  }

  if (!workspaceRoot) {
    fail(
      'Not inside an OWD workspace.',
      'Run from the client repo (needs pnpm-workspace.yaml + nx.json), or use a generated project with the same layout.',
    )
  }

  let pkgInfo

  if (cmd === 'add') {
    pkgInfo = parseAddArgs(_.slice(1))
  } else if (LEGACY_COMMANDS[cmd]) {
    pkgInfo = parseLegacyInstall(cmd, _.slice(1))
  } else {
    fail(`Unknown command: ${cmd}`, `Use \`${name}\`, \`${name} dev\`, or \`${name} add <package>\`.`)
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
