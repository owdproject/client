import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import getopts from 'getopts'

const require = createRequire(import.meta.url)

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
  ${name} add <package> [options]
  ${name} add <kind> <name> [options]

KINDS (optional — inferred from the package name)
  app       app-*     → apps/
  module    module-*, kit-*  → packages/
  theme     theme-*   → themes/

OPTIONS
  --from <source>   Where to fetch the package (default: see below)
  --branch <name>   Git branch to clone
  --npm             Install from the npm registry (skips git clone)
  --dry-run         Print the plan without changing anything
  -h, --help        Show this help

--from <source>
  (omit)          In the OWD monorepo: clone github.com/owdproject/<package>
                  Elsewhere: install from npm
  npm             Always install from npm
  <github-user>   Your fork: github.com/<user>/<package>
  <user>/<repo>   Explicit GitHub repo (fork or renamed repo)
  <git-url>       Full URL or git@github.com:…

EXAMPLES
  ${name} add app-todo
  ${name} add module-persistence
  ${name} add app-todo --from dxlliv
  ${name} add theme-gnome --from dxlliv --branch my-feature
  ${name} add module-fs --from https://github.com/dxlliv/module-fs
  ${name} add app-todo --npm
  ${name} add app todo --from dxlliv

LEGACY (still supported)
  ${name} install-app @owdproject/app-todo
  → prefer: ${name} add app-todo
`
}

function findWorkspaceRoot(startDir = process.cwd()) {
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

function fail(message, hint) {
  console.error(`\n✗ ${message}`)
  if (hint) console.error(`  ${hint}`)
  console.error(`\nRun \`${commandName} --help\` for usage.\n`)
  process.exit(1)
}

function warn(message) {
  console.warn(`\n⚠ ${message}\n`)
}

function inferKind(shortName) {
  if (shortName.startsWith('app-')) return 'app'
  if (shortName.startsWith('theme-')) return 'theme'
  return 'module'
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

/**
 * @param {string | undefined} from
 * @param {string} shortName
 * @param {boolean} inMonorepo
 */
function resolveSource(from, shortName, inMonorepo) {
  if (!from || from === 'owdproject' || from === 'official') {
    return {
      mode: inMonorepo ? 'workspace' : 'npm',
      gitUrl: `https://github.com/owdproject/${shortName}.git`,
      label: 'github.com/owdproject/' + shortName,
    }
  }

  if (from === 'npm' || from === 'registry') {
    return { mode: 'npm', label: 'npm registry' }
  }

  const trimmed = from.trim()

  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('git@') ||
    trimmed.startsWith('ssh://')
  ) {
    return {
      mode: 'workspace',
      gitUrl: normalizeGitUrl(trimmed),
      label: trimmed,
    }
  }

  const slug = trimmed
    .replace(/^github:/, '')
    .replace(/^fork:/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')

  if (slug.includes('/')) {
    const gitUrl = normalizeGitUrl(`https://github.com/${slug}`)
    return { mode: 'workspace', gitUrl, label: slug }
  }

  return {
    mode: 'workspace',
    gitUrl: `https://github.com/${slug}/${shortName}.git`,
    label: `github.com/${slug}/${shortName}`,
  }
}

function normalizeGitUrl(input) {
  const trimmed = input.trim().replace(/\/$/, '')
  if (trimmed.startsWith('git@') || trimmed.startsWith('ssh://')) return trimmed
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed.endsWith('.git') ? trimmed : `${trimmed}.git`
  }
  const path = trimmed
    .replace(/^github\.com\//, '')
    .replace(/^https?:\/\/github\.com\//, '')
  if (/^[\w.-]+\/[\w.-]+/.test(path)) {
    return `https://github.com/${path.split('/').slice(0, 2).join('/')}.git`
  }
  fail(`Could not parse git source: "${input}"`, 'Use a URL, user/repo, or GitHub username.')
}

function loadConfigUtil(workspaceRoot) {
  const utilPath = join(
    workspaceRoot,
    'node_modules/@owdproject/nx/dist/utils/utilConfig.js',
  )
  if (!existsSync(utilPath)) {
    fail(
      'Workspace install needs @owdproject/nx.',
      'Run `pnpm install` at the repo root.',
    )
  }
  return require(utilPath)
}

function printPlan({ pkgName, kind, targetDir, source, branch, dryRun }) {
  const kindMeta = KINDS[kind]
  console.log(`
${dryRun ? 'Plan (dry run)' : 'Adding to desktop'}
────────────────────────────────────────
  Package   ${pkgName}
  Type      ${kindMeta.label}
  Folder    ${targetDir}/
  Source    ${source.label}${branch ? ` (branch: ${branch})` : ''}
  Config    desktop/owd.config.ts → ${kindMeta.configKey}
────────────────────────────────────────
`)
}

function printNextSteps({ targetDir, dryRun }) {
  if (dryRun) {
    console.log('Dry run complete. Re-run without --dry-run to apply.\n')
    return
  }
  console.log(`Next steps:
  pnpm run dev               Start the desktop
  pnpm run prepare:modules   Rebuild module stubs if needed

  Package lives in ${targetDir}/
`)
}

function cloneRepo(targetDir, gitUrl, branch, workspaceRoot) {
  const absoluteTarget = join(workspaceRoot, targetDir)

  if (existsSync(join(absoluteTarget, 'package.json'))) {
    console.log(`Folder ${targetDir}/ already exists — skipping clone.\n`)
    return
  }

  if (existsSync(absoluteTarget)) {
    fail(
      `${targetDir}/ exists but has no package.json.`,
      'Remove the folder or clone your fork there manually.',
    )
  }

  const branchArg = branch ? `-b ${JSON.stringify(branch)} ` : ''
  console.log(`Cloning into ${targetDir}/ …\n`)
  execSync(
    `git clone ${branchArg}${JSON.stringify(gitUrl)} ${JSON.stringify(absoluteTarget)}`,
    { stdio: 'inherit', cwd: workspaceRoot },
  )
}

function linkWorkspacePackage(desktopPath, pkgName) {
  execSync(`pnpm add ${pkgName}@workspace:*`, {
    stdio: 'inherit',
    cwd: desktopPath,
  })
}

function runDevPrepare(workspaceRoot, pkgName) {
  try {
    execSync(`pnpm --filter "${pkgName}" run dev:prepare`, {
      stdio: 'inherit',
      cwd: workspaceRoot,
    })
  } catch {
    console.log('(no dev:prepare script — ok for some packages)\n')
  }
}

async function runWorkspaceInstall({
  pkgName,
  shortName,
  kind,
  workspaceRoot,
  source,
  branch,
  dryRun,
}) {
  const { configKey, workspaceDir } = KINDS[kind]
  const targetDir = join(workspaceDir, shortName)
  const desktopPath = join(workspaceRoot, 'desktop')
  const configPath = join(desktopPath, 'owd.config.ts')

  printPlan({
    pkgName,
    kind,
    targetDir,
    source,
    branch,
    dryRun,
  })

  if (dryRun) {
    printNextSteps({ targetDir, dryRun: true })
    return
  }

  cloneRepo(targetDir, source.gitUrl, branch, workspaceRoot)
  linkWorkspacePackage(desktopPath, pkgName)

  const { addToDesktopConfig } = loadConfigUtil(workspaceRoot)
  addToDesktopConfig(configPath, configKey, pkgName)

  runDevPrepare(workspaceRoot, pkgName)

  console.log(`✓ ${pkgName} is ready.\n`)
  printNextSteps({ targetDir, dryRun: false })
}

function runNpmInstall(kind, pkgName, workspaceRoot) {
  const nxTarget = KINDS[kind].nx
  const child = spawn('pnpm', ['nx', 'run', nxTarget, `--name=${pkgName}`], {
    stdio: 'inherit',
    shell: true,
    cwd: workspaceRoot,
  })
  child.on('exit', (code) => process.exit(code ?? 1))
}

function mapLegacyFlags(parsed) {
  const { dev, fork, repo, branch, from, npm } = parsed
  let mappedFrom = from
  let mappedNpm = npm

  if (fork || repo) {
    warn('`--fork` and `--repo` are deprecated — use `--from` instead.')
    mappedFrom = repo || fork
  }
  if (dev && !mappedFrom && !mappedNpm) {
    mappedFrom = 'owdproject'
  }
  if (mappedNpm) mappedFrom = 'npm'

  return { from: mappedFrom, branch, npm: mappedNpm }
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
    boolean: ['help', 'npm', 'dry-run', 'dev'],
    string: ['from', 'branch', 'fork', 'repo'],
  })

  const { _, help, npm: npmFlag } = parsed
  const dryRun = parsed['dry-run'] === true
  const { from, branch, npm: npmFromLegacy } = mapLegacyFlags(parsed)
  const useNpm = npmFlag || npmFromLegacy

  if (help || !_[0] || _[0] === 'help') {
    console.log(buildHelp(name))
    process.exit(_[0] && !help ? 1 : 0)
  }

  const workspaceRoot = findWorkspaceRoot()
  if (!workspaceRoot) {
    fail(
      'Not inside an OWD workspace.',
      'Run from the client repo (needs pnpm-workspace.yaml + nx.json), or use a generated project with the same layout.',
    )
  }

  const cmd = _[0]
  let pkgInfo

  if (cmd === 'add') {
    pkgInfo = parseAddArgs(_.slice(1))
  } else if (LEGACY_COMMANDS[cmd]) {
    pkgInfo = parseLegacyInstall(cmd, _.slice(1))
  } else {
    fail(`Unknown command: ${cmd}`, `Use \`${name} add <package>\`.`)
  }

  const { pkgName, shortName, kind } = pkgInfo
  const source = resolveSource(useNpm ? 'npm' : from, shortName, Boolean(workspaceRoot))

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
