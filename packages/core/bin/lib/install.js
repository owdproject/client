import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  KINDS,
  shortName as toShortName,
  isWorkspaceInstallMode,
  inferKind,
} from './workspace.js'
import {
  githubCloneUrl,
  resolveForkUser,
} from './packageSources.js'
import {
  resolveDesktopConfigPath,
  desktopConfigWritePath,
} from './desktopConfig.js'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const desktopBin = join(__dirname, '..', 'desktop.js')

/**
 * Runs a shell command asynchronously without blocking the event loop.
 * Resolves when the process exits with code 0, rejects otherwise.
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string, stdio?: 'pipe' | 'inherit' | 'ignore' }} [options]
 */
export function spawnAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      stdio: options.stdio ?? 'pipe',
      shell: process.platform === 'win32',
    })
    let out = ''
    let err = ''
    if (child.stdout) child.stdout.on('data', (d) => { out += d.toString() })
    if (child.stderr) child.stderr.on('data', (d) => { err += d.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else {
        const combined = [err.trim(), out.trim()].filter(Boolean).join('\n')
        reject(new Error(combined || `Process exited with code ${code}`))
      }
    })
  })
}

const SCOPE = '@owdproject/'

/**
 * @param {string | undefined} from
 * @param {string} pkgShortName
 * @param {boolean} inMonorepo
 * @param {{ npm?: boolean, dev?: boolean }} [options]
 */
export function resolveSource(from, pkgShortName, inMonorepo, options = {}) {
  const { npm = false, dev = false } = options

  if (npm || from === 'npm' || from === 'registry') {
    return { mode: 'npm', label: 'npm registry' }
  }

  if (dev && inMonorepo) {
    return {
      mode: 'workspace',
      gitUrl: `https://github.com/owdproject/${pkgShortName}.git`,
      label: `github.com/owdproject/${pkgShortName}`,
    }
  }

  if (!from) {
    return { mode: 'npm', label: 'npm registry' }
  }

  if (from === 'owdproject' || from === 'official') {
    if (!inMonorepo) {
      return { mode: 'npm', label: 'npm registry' }
    }
    return {
      mode: 'workspace',
      gitUrl: `https://github.com/owdproject/${pkgShortName}.git`,
      label: `github.com/owdproject/${pkgShortName}`,
    }
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

  if (!inMonorepo) {
    return { mode: 'npm', label: 'npm registry' }
  }

  return {
    mode: 'workspace',
    gitUrl: `https://github.com/${slug}/${pkgShortName}.git`,
    label: `github.com/${slug}/${pkgShortName}`,
  }
}

export function normalizeGitUrl(input) {
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
  throw new Error(`Could not parse git source: "${input}"`)
}

/**
 * @param {string} workspaceRoot
 * @param {string} pkgName full @owdproject/name
 */
export function hasLocalWorkspaceSource(workspaceRoot, pkgName) {
  const pkgShort = toShortName(pkgName)
  const kind = inferKind(pkgShort)
  return existsSync(join(workspaceRoot, KINDS[kind].workspaceDir, pkgShort, 'package.json'))
}

export { resolveForkUser } from './packageSources.js'

/**
 * @typedef {import('./packageSources.js').InstallSourceChoice} InstallSourceChoice
 */

/**
 * @param {InstallSourceChoice} sourceChoice
 * @param {string} pkgShort
 */
export function sourceChoiceToGitUrl(sourceChoice, pkgShort) {
  if (sourceChoice.type !== 'git') return null
  return githubCloneUrl(sourceChoice.owner, pkgShort, sourceChoice.protocol)
}

/**
 * @param {string} pkgName full @owdproject/name
 * @param {{ installMode?: string, githubUser?: string | null }} settings
 * @param {string | null} workspaceRoot
 * @param {InstallSourceChoice} [sourceChoice]
 */
export async function resolveInstallPlan(pkgName, settings, workspaceRoot, sourceChoice) {
  const pkgShort = toShortName(pkgName)
  const kind = inferKind(pkgShort)
  const inMonorepo = Boolean(workspaceRoot)

  if (sourceChoice) {
    if (sourceChoice.type === 'npm') {
      return {
        mode: 'npm',
        pkgName,
        shortName: pkgShort,
        kind,
        label: 'npm registry',
        sourceChoice,
      }
    }

    if (!inMonorepo) {
      return {
        error: 'Git clone requires an OWD monorepo (apps/, packages/, themes/).',
      }
    }

    const gitUrl = sourceChoiceToGitUrl(sourceChoice, pkgShort)
    const owner = sourceChoice.owner
    return {
      mode: 'workspace',
      pkgName,
      shortName: pkgShort,
      kind,
      from: owner,
      source: {
        mode: 'workspace',
        gitUrl,
        label: `${sourceChoice.protocol === 'ssh' ? 'SSH' : 'HTTPS'} github.com/${owner}/${pkgShort}`,
      },
      targetDir: join(KINDS[kind].workspaceDir, pkgShort),
      label: `github.com/${owner}/${pkgShort}`,
      sourceChoice,
    }
  }

  if (!isWorkspaceInstallMode(settings)) {
    return {
      mode: 'npm',
      pkgName,
      shortName: pkgShort,
      kind,
      label: 'npm registry',
    }
  }

  if (!inMonorepo) {
    return {
      error:
        'Dev install mode requires an OWD monorepo (apps/, packages/, themes/). Switch to User mode or use --npm.',
    }
  }

  const fromUser = settings.githubUser
    ? await resolveForkUser(settings.githubUser, pkgShort)
    : 'owdproject'

  const source = resolveSource(fromUser, pkgShort, true)
  return {
    mode: 'workspace',
    pkgName,
    shortName: pkgShort,
    kind,
    from: fromUser,
    source,
    targetDir: join(KINDS[kind].workspaceDir, pkgShort),
    label: source.label,
  }
}

/**
 * @param {string} pkgName
 * @param {{ installMode?: string, githubUser?: string | null }} settings
 * @param {string} workspaceRoot
 * @param {{ stdio?: 'inherit' | 'pipe' }} [options]
 */
export async function installPackage(pkgName, settings, workspaceRoot, options = {}) {
  const plan = await resolveInstallPlan(
    pkgName,
    settings,
    workspaceRoot,
    options.sourceChoice,
  )
  if (plan.error) throw new Error(plan.error)

  const args = [desktopBin, 'add', plan.shortName]

  if (plan.mode === 'npm') {
    args.push('--npm')
  } else if (plan.sourceChoice?.type === 'git') {
    const { owner, protocol } = plan.sourceChoice
    if (protocol === 'ssh') {
      args.push('--from', githubCloneUrl(owner, plan.shortName, 'ssh'))
    } else if (owner !== 'owdproject') {
      args.push('--from', owner)
    } else {
      args.push('--dev')
    }
  } else if (plan.from && plan.from !== 'owdproject') {
    args.push('--from', plan.from)
  } else {
    args.push('--dev')
  }

  await spawnAsync(process.execPath, args, { cwd: workspaceRoot })

  return plan
}

export async function runPrepareModules(workspaceRoot, _stdio = 'inherit') {
  try {
    await spawnAsync('pnpm', ['run', 'prepare:modules'], { cwd: workspaceRoot })
  } catch {
    /* optional in minimal workspaces */
  }
}

function loadConfigUtil(workspaceRoot) {
  const utilPath = join(
    workspaceRoot,
    'node_modules/@owdproject/nx/dist/utils/utilConfig.js',
  )
  if (!existsSync(utilPath)) {
    throw new Error('Workspace install needs @owdproject/nx. Run `pnpm install` at the repo root.')
  }
  return require(utilPath)
}

export function printPlan({ pkgName, kind, targetDir, source, branch, dryRun }) {
  const kindMeta = KINDS[kind]
  console.log(`
${dryRun ? 'Plan (dry run)' : 'Adding to desktop'}
────────────────────────────────────────
  Package   ${pkgName}
  Type      ${kindMeta.label}
  Folder    ${targetDir}/
  Source    ${source.label}${branch ? ` (branch: ${branch})` : ''}
  Config    desktop/desktop.config.ts → ${kindMeta.configKey}
────────────────────────────────────────
`)
}

export function printNextSteps({ targetDir, dryRun }) {
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

/**
 * @param {string} targetDir
 * @param {string} gitUrl
 * @param {string | undefined} branch
 * @param {string} workspaceRoot
 * @param {{ stdio?: 'inherit' | 'pipe' | 'ignore', quiet?: boolean }} [options]
 */
export async function cloneRepo(targetDir, gitUrl, branch, workspaceRoot, options = {}) {
  const quiet = options.quiet ?? true
  const absoluteTarget = join(workspaceRoot, targetDir)

  if (existsSync(join(absoluteTarget, 'package.json'))) {
    if (!quiet) console.log(`Folder ${targetDir}/ already exists — skipping clone.\n`)
    return
  }

  if (existsSync(absoluteTarget)) {
    throw new Error(
      `${targetDir}/ exists but has no package.json. Remove the folder or clone your fork there manually.`,
    )
  }

  const args = ['clone']
  if (branch) args.push('-b', branch)
  args.push(gitUrl, absoluteTarget)

  if (!quiet) console.log(`Cloning into ${targetDir}/ …\n`)
  await spawnAsync('git', args, { cwd: workspaceRoot })
}

async function linkWorkspacePackage(desktopPath, pkgName) {
  await spawnAsync('pnpm', ['add', `${pkgName}@workspace:*`], { cwd: desktopPath })
}

async function runDevPrepare(workspaceRoot, pkgName, options = {}) {
  const quiet = options.quiet ?? true
  try {
    await spawnAsync('pnpm', ['--filter', pkgName, 'run', 'dev:prepare'], { cwd: workspaceRoot })
  } catch {
    if (!quiet) console.log('(no dev:prepare script — ok for some packages)\n')
  }
}

export async function runWorkspaceInstall({
  pkgName,
  shortName: pkgShort,
  kind,
  workspaceRoot,
  source,
  branch,
  dryRun,
}) {
  const { workspaceDir } = KINDS[kind]
  const targetDir = join(workspaceDir, pkgShort)
  const desktopPath = join(workspaceRoot, 'desktop')
  const resolved = resolveDesktopConfigPath(desktopPath)
  const configPath = resolved?.path ?? desktopConfigWritePath(desktopPath)

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

  await cloneRepo(targetDir, source.gitUrl, branch, workspaceRoot)
  await linkWorkspacePackage(desktopPath, pkgName)

  const { addToDesktopConfig } = loadConfigUtil(workspaceRoot)
  addToDesktopConfig(configPath, KINDS[kind].configKey, pkgName)

  await runDevPrepare(workspaceRoot, pkgName)

  console.log(`✓ ${pkgName} is ready.\n`)
  printNextSteps({ targetDir, dryRun: false })
}

export function runNpmInstall(kind, pkgName, workspaceRoot, stdio = 'inherit') {
  const nxTarget = KINDS[kind].nx
  const child = spawn('pnpm', ['nx', 'run', nxTarget, `--name=${pkgName}`], {
    stdio,
    shell: true,
    cwd: workspaceRoot,
  })
  child.on('exit', (code) => {
    if (stdio === 'inherit') process.exit(code ?? 1)
  })
  return child
}

/** Preview label for TUI list rows */
/**
 * @param {string} pkgName
 * @param {{ installMode?: string, githubUser?: string | null }} settings
 * @param {string} workspaceRoot
 * @param {{ stdio?: 'inherit' | 'pipe' }} [options]
 */
export async function materializeToWorkspace(pkgName, settings, workspaceRoot, options = {}) {
  const plan = await resolveInstallPlan(
    pkgName,
    settings,
    workspaceRoot,
    options.sourceChoice,
  )
  if (plan.error) throw new Error(plan.error)
  if (plan.mode !== 'workspace') {
    throw new Error(`Cannot materialize ${pkgName}: source is not a git workspace clone.`)
  }

  if (hasLocalWorkspaceSource(workspaceRoot, pkgName)) {
    return { skipped: true, plan }
  }

  const desktopPath = join(workspaceRoot, 'desktop')

  await cloneRepo(plan.targetDir, plan.source.gitUrl, undefined, workspaceRoot, { quiet: true })
  await linkWorkspacePackage(desktopPath, pkgName)
  await runDevPrepare(workspaceRoot, pkgName, { quiet: true })

  return { skipped: false, plan }
}

/** @param {import('./catalog.js').CatalogEntry} item */
export function catalogListTag(item) {
  if (item.localSource) return 'local'
  if (item.installed && !item.localSource) return 'npm'
  if (item.org === 'workspace') return 'local'
  return 'catalog'
}

export function installTag(_settings, item) {
  const tag = catalogListTag(item)
  if (tag === 'catalog') {
    if (item.sourcesMeta?.npm?.version) return 'npm+git'
    return 'git'
  }
  return tag
}
