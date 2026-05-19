import { execSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_TEMPLATE = resolve(__dirname, '../../../../template')
const DEFAULT_CLIENT_REPO = 'https://github.com/owdproject/client.git'

/**
 * @param {string} [startDir]
 */
export function resolveLocalTemplatePath(startDir = process.cwd()) {
  const fromEnv = process.env.OWD_TEMPLATE_PATH?.trim()
  if (fromEnv && existsSync(join(fromEnv, 'package.json'))) {
    return resolve(fromEnv)
  }

  if (existsSync(join(CLIENT_TEMPLATE, 'package.json'))) {
    return CLIENT_TEMPLATE
  }

  let dir = startDir
  for (;;) {
    const candidate = join(dir, 'template')
    if (
      existsSync(join(candidate, 'package.json')) &&
      existsSync(join(dir, 'pnpm-workspace.yaml'))
    ) {
      return candidate
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return null
}

/**
 * @param {string} templatePath
 * @param {string} targetDir
 */
export function copyTemplate(templatePath, targetDir) {
  cpSync(templatePath, targetDir, { recursive: true, filter: (src) => !src.includes('node_modules') })
}

/**
 * @param {string} targetDir
 * @param {{ repo?: string, templatePath?: string | null, cwd?: string }} [options]
 */
export async function cloneTemplate(targetDir, options = {}) {
  const localTemplate = options.templatePath ?? resolveLocalTemplatePath(options.cwd)

  if (localTemplate) {
    copyTemplate(localTemplate, targetDir)
    return { source: 'local', path: localTemplate }
  }

  const repo = options.repo ?? DEFAULT_CLIENT_REPO
  const tempParent = mkdtempSync(join(tmpdir(), 'owd-scaffold-'))
  const tempClone = join(tempParent, 'client')

  try {
    execSync(`git clone --depth 1 ${JSON.stringify(repo)} ${JSON.stringify(tempClone)}`, {
      stdio: 'inherit',
    })

    const templatePath = join(tempClone, 'template')
    if (!existsSync(templatePath)) {
      throw new Error('Template directory does not exist in the cloned repository.')
    }

    copyTemplate(templatePath, targetDir)
    return { source: 'git', path: repo }
  } finally {
    try {
      rmSync(tempParent, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {string} targetDir
 */
export function runPostScaffold(targetDir) {
  execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' })
}

export function canLaunchUi() {
  return Boolean(process.stdout.isTTY) && !process.env.CI
}

/**
 * @param {string} targetDir
 * @param {string} [commandName]
 */
export function launchControlPanel(targetDir, commandName = 'desktop') {
  const relDir = basename(targetDir)

  if (!canLaunchUi()) {
    console.log(`\nNext: cd ${relDir} && pnpm desktop ui\n`)
    return false
  }

  console.log('\nOpening control panel (desktop ui)…\n')
  const result = spawnSync('pnpm', ['exec', commandName, 'ui'], {
    cwd: targetDir,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0 && result.status !== null) {
    console.log(`\nControl panel exited. Run again with: cd ${relDir} && pnpm desktop ui\n`)
  }

  return true
}

/**
 * @param {{ dir?: string, cwd?: string, commandName?: string, skipInstall?: boolean, skipUi?: boolean, repo?: string }} [options]
 */
export async function scaffoldProject(options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const dir = (options.dir ?? 'owd-client').trim()
  const commandName = options.commandName ?? 'desktop'

  if (!dir) {
    throw new Error('Project directory name is required.')
  }

  const targetDir = resolve(cwd, dir)

  if (existsSync(targetDir)) {
    if (existsSync(join(targetDir, 'package.json'))) {
      throw new Error(`Directory "${dir}" already exists and contains a package.json.`)
    }
    throw new Error(`Directory "${dir}" already exists.`)
  }

  mkdirSync(targetDir, { recursive: true })

  console.log(`\nScaffolding Open Web Desktop project in ${dir}/…\n`)
  const cloneResult = await cloneTemplate(targetDir, {
    repo: options.repo,
    cwd,
  })

  if (cloneResult.source === 'local') {
    console.log(`Using local template: ${cloneResult.path}\n`)
  }

  if (!options.skipInstall) {
    console.log('Installing dependencies (pnpm install)…\n')
    runPostScaffold(targetDir)
  }

  console.log('\n✓ Project ready\n')

  if (!options.skipUi) {
    const launched = launchControlPanel(targetDir, commandName)
    if (launched) {
      console.log(`\nLater: cd ${dir} && pnpm run dev · pnpm desktop ui\n`)
    } else {
      console.log(`  cd ${dir}`)
      console.log('  pnpm desktop ui    # control panel')
      console.log('  pnpm run dev       # Nuxt dev server\n')
    }
  } else {
    console.log(`  cd ${dir}`)
    console.log('  pnpm desktop ui')
    console.log('  pnpm run dev\n')
  }

  return { targetDir, dir }
}

/** Copy scaffold.js into create-owd for npm publish (run from repo root). */
export function vendorScaffoldForCreateOwd(createOwdRoot) {
  const src = join(__dirname, 'scaffold.js')
  const destDir = join(createOwdRoot, 'src/lib')
  const dest = join(destDir, 'scaffold.js')
  mkdirSync(destDir, { recursive: true })
  writeFileSync(dest, readFileSync(src, 'utf8'))
  return dest
}
