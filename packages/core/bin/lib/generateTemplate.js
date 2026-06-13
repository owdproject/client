import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchLatestVersions,
  isOwdScopedPackage,
  resolveLatestVersions,
} from './npmVersions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BLUEPRINT_ROOT = resolve(__dirname, '../../template-blueprint')

export const STARTER_DESKTOP_DEPS = [
  '@owdproject/core',
  '@owdproject/theme-nova',
  '@owdproject/app-about',
  'h3',
]

/** Used when a starter package is not on npm yet (before first publish). */
export const TEMPLATE_NPM_FALLBACK_VERSIONS = {
  '@owdproject/core': '3.4.0',
  '@owdproject/theme-nova': '0.0.1',
}

const DESKTOP_COPY_FILES = [
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.spec.json',
  '.npmrc',
]

const ROOT_COPY_FROM_MONOREPO = [
  'nx.json',
  'tsconfig.base.json',
  'tsconfig.json',
  '.editorconfig',
  '.npmrc',
  '.prettierrc',
  '.prettierignore',
]

const DESKTOP_SKIP_NAMES = new Set([
  'node_modules',
  '.nuxt',
  '.output',
  'dist',
  '.env',
  '.data',
  'vitest.config.ts',
  'tsconfig.tsbuildinfo',
  'package.json',
  'desktop.config.ts',
  'nuxt.config.ts',
  'app',
])

const BLUEPRINT_SKIP_NAMES = new Set(['root-package.json'])

/**
 * @param {string} blueprintRoot
 */
export function resolveBlueprintRoot(blueprintRoot = BLUEPRINT_ROOT) {
  if (!existsSync(join(blueprintRoot, 'pnpm-workspace.yaml'))) {
    throw new Error(`Template blueprint not found at ${blueprintRoot}`)
  }
  return blueprintRoot
}

/**
 * @param {string} src
 * @param {string} dest
 * @param {Set<string>} [skipNames]
 */
function copyTree(src, dest, skipNames = new Set()) {
  if (!existsSync(src)) return
  const stat = statSync(src)
  if (stat.isFile()) {
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(src, dest)
    return
  }

  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    if (skipNames.has(name)) continue
    copyTree(join(src, name), join(dest, name), skipNames)
  }
}

/**
 * @param {string} workspaceRoot
 */
function readMonorepoPackageJson(workspaceRoot) {
  const path = join(workspaceRoot, 'package.json')
  return JSON.parse(readFileSync(path, 'utf8'))
}

function resolveCatalogVersion(workspaceRoot, name, specifier) {
  if (specifier !== 'catalog:') return specifier

  const yamlPath = join(workspaceRoot, 'pnpm-workspace.yaml')
  if (!existsSync(yamlPath)) return specifier

  const content = readFileSync(yamlPath, 'utf8')
  const lines = content.split('\n')
  let insideCatalog = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'catalog:') {
      insideCatalog = true
      continue
    }
    if (insideCatalog) {
      if (line.match(/^\s+/)) {
        const match = trimmed.match(/^([^:]+):\s*(.+)$/)
        if (match && match[1].trim() === name) {
          return match[2].trim()
        }
      } else if (trimmed) {
        insideCatalog = false
      }
    }
  }

  return specifier
}

/**
 * @param {string} workspaceRoot
 * @param {{ useCache?: boolean }} [options]
 */
export async function resolveTemplateVersions(workspaceRoot, options = {}) {
  const monorepo = readMonorepoPackageJson(workspaceRoot)
  const monorepoDevDeps = monorepo.devDependencies ?? {}

  const owdPackages = [
    ...new Set([
      ...STARTER_DESKTOP_DEPS,
      ...Object.keys(monorepoDevDeps).filter(isOwdScopedPackage),
    ]),
  ]

  const npmLatest = await resolveLatestVersions(workspaceRoot, owdPackages, options)

  /** @type {Record<string, string>} */
  const versions = { ...monorepoDevDeps, ...npmLatest }
  for (const name of Object.keys(versions)) {
    if (versions[name] === 'catalog:') {
      versions[name] = resolveCatalogVersion(workspaceRoot, name, versions[name])
    }
  }

  for (const name of STARTER_DESKTOP_DEPS) {
    versions[name] =
      npmLatest[name] ?? TEMPLATE_NPM_FALLBACK_VERSIONS[name] ?? monorepoDevDeps[name]
    if (!versions[name]) {
      throw new Error(`Could not resolve version for ${name}`)
    }
  }

  return versions
}

/**
 * @param {Record<string, string>} versions
 */
function buildTemplateRootPackageJson(versions) {
  const base = JSON.parse(readFileSync(join(BLUEPRINT_ROOT, 'root-package.json'), 'utf8'))
  /** @type {Record<string, string>} */
  const devDependencies = {}
  for (const [name, range] of Object.entries(versions)) {
    if (name === 'h3') continue
    devDependencies[name] = range
  }
  base.devDependencies = Object.fromEntries(
    Object.entries(devDependencies).sort(([a], [b]) => a.localeCompare(b)),
  )
  return `${JSON.stringify(base, null, 2)}\n`
}

/**
 * @param {Record<string, string>} versions
 */
function buildTemplateDesktopPackageJson(versions) {
  /** @type {Record<string, string>} */
  const dependencies = {}
  for (const name of STARTER_DESKTOP_DEPS) {
    dependencies[name] = versions[name]
  }

  const pkg = {
    name: '@owdproject/client',
    private: true,
    nx: { name: 'desktop' },
    scripts: {
      build: 'nuxt generate',
      dev: 'nuxt dev --host',
      generate: 'nuxt generate --dev',
      postinstall: 'nuxt prepare',
      preview: 'nuxt preview',
    },
    dependencies: Object.fromEntries(
      Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)),
    ),
  }

  return `${JSON.stringify(pkg, null, 2)}\n`
}

/**
 * @param {string} srcPath
 */
function readProjectJson(srcPath) {
  const raw = readFileSync(srcPath, 'utf8')
  const data = JSON.parse(raw)
  if (data.name === 'desktopx') data.name = 'desktop'
  return `${JSON.stringify(data, null, 2)}\n`
}

/**
 * @param {string} workspaceRoot
 * @param {string} outputRoot
 * @param {{ versions: Record<string, string> }} ctx
 */
function writeGeneratedFiles(workspaceRoot, outputRoot, ctx) {
  const { versions } = ctx
  const desktopSrc = join(workspaceRoot, 'desktop')
  const desktopOut = join(outputRoot, 'desktop')
  const blueprint = resolveBlueprintRoot()

  mkdirSync(outputRoot, { recursive: true })

  copyTree(blueprint, outputRoot, BLUEPRINT_SKIP_NAMES)

  writeFileSync(join(outputRoot, 'package.json'), buildTemplateRootPackageJson(versions))

  mkdirSync(desktopOut, { recursive: true })
  for (const file of DESKTOP_COPY_FILES) {
    const src = join(desktopSrc, file)
    if (existsSync(src)) {
      cpSync(src, join(desktopOut, file))
    }
  }

  const i18nBlueprint = join(blueprint, 'desktop/i18n')
  if (existsSync(i18nBlueprint)) {
    copyTree(i18nBlueprint, join(desktopOut, 'i18n'))
  }

  const projectJsonSrc = join(desktopSrc, 'project.json')
  if (existsSync(projectJsonSrc)) {
    writeFileSync(join(desktopOut, 'project.json'), readProjectJson(projectJsonSrc))
  }

  for (const file of ROOT_COPY_FROM_MONOREPO) {
    const src = join(workspaceRoot, file)
    if (existsSync(src)) {
      cpSync(src, join(outputRoot, file))
    }
  }

  writeFileSync(join(desktopOut, 'package.json'), buildTemplateDesktopPackageJson(versions))
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listFilesRecursive(dir) {
  if (!existsSync(dir)) return []
  /** @type {string[]} */
  const files = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue
      files.push(...listFilesRecursive(path))
    } else {
      files.push(path)
    }
  }
  return files
}

/**
 * @param {string} aRoot
 * @param {string} bRoot
 */
export function diffTemplateTrees(aRoot, bRoot) {
  const aFiles = new Set(listFilesRecursive(aRoot).map((p) => relative(aRoot, p)))
  const bFiles = new Set(listFilesRecursive(bRoot).map((p) => relative(bRoot, p)))
  /** @type {{ path: string, type: 'missing' | 'extra' | 'changed' }[]} */
  const diffs = []

  for (const rel of aFiles) {
    if (!bFiles.has(rel)) {
      diffs.push({ path: rel, type: 'missing' })
      continue
    }
    const a = readFileSync(join(aRoot, rel))
    const b = readFileSync(join(bRoot, rel))
    if (!a.equals(b)) diffs.push({ path: rel, type: 'changed' })
  }

  for (const rel of bFiles) {
    if (!aFiles.has(rel)) diffs.push({ path: rel, type: 'extra' })
  }

  return diffs.sort((x, y) => x.path.localeCompare(y.path))
}

/**
 * @param {string} workspaceRoot
 * @param {{ dryRun?: boolean, check?: boolean, useCache?: boolean }} [options]
 */
export async function generateTemplate(workspaceRoot, options = {}) {
  const { dryRun = false, check = false, useCache = true } = options
  const templateOut = join(workspaceRoot, 'template')
  const desktopPath = join(workspaceRoot, 'desktop')

  if (!existsSync(desktopPath)) {
    throw new Error(`Monorepo desktop/ not found at ${desktopPath}`)
  }
  resolveBlueprintRoot()

  const versions = await resolveTemplateVersions(workspaceRoot, { useCache })

  if (dryRun) {
    console.log('\nTemplate generation plan (dry run)\n')
    console.log('Output:', templateOut)
    console.log('\nStarter desktop dependencies:')
    for (const name of STARTER_DESKTOP_DEPS) {
      console.log(`  ${name}  ${versions[name]}`)
    }
    console.log('\nRoot devDependencies (@owdproject/* from npm):')
    for (const [name, range] of Object.entries(versions).sort(([a], [b]) => a.localeCompare(b))) {
      if (isOwdScopedPackage(name)) console.log(`  ${name}  ${range}`)
    }
    console.log('\nSources:')
    console.log(`  blueprint  ${BLUEPRINT_ROOT}`)
    console.log(`  desktop/   ${desktopPath}`)
    console.log(`  monorepo   ${workspaceRoot}`)
    console.log('')
    return { versions, outputRoot: templateOut }
  }

  const outputRoot = check ? mkdtempSync(join(tmpdir(), 'owd-template-check-')) : templateOut

  try {
    if (!check && existsSync(templateOut)) {
      rmSync(templateOut, { recursive: true, force: true })
    }

    writeGeneratedFiles(workspaceRoot, outputRoot, { versions })

    if (check) {
      const diffs = diffTemplateTrees(templateOut, outputRoot)
      if (diffs.length === 0) {
        console.log('\n✓ template/ is up to date\n')
        return { ok: true, versions }
      }

      console.error('\n✗ template/ is out of date\n')
      for (const d of diffs.slice(0, 40)) {
        const label =
          d.type === 'missing'
            ? 'only in committed template'
            : d.type === 'extra'
              ? 'missing from committed template'
              : 'changed'
        console.error(`  ${label}: ${d.path}`)
      }
      if (diffs.length > 40) {
        console.error(`  … and ${diffs.length - 40} more`)
      }
      console.error('\nRun: pnpm desktop template\n')
      return { ok: false, versions, diffs }
    }

    console.log('\n✓ Generated template/\n')
    console.log('Starter packages:')
    for (const name of STARTER_DESKTOP_DEPS) {
      console.log(`  ${name}  ${versions[name]}`)
    }
    console.log('\nCommit template/ when ready.\n')
    return { ok: true, versions, outputRoot }
  } finally {
    if (check && existsSync(outputRoot)) {
      rmSync(outputRoot, { recursive: true, force: true })
    }
  }
}

/**
 * @param {{ workspaceRoot: string, dryRun?: boolean, check?: boolean }} options
 */
export async function runGenerateTemplateCli(options) {
  const { workspaceRoot, dryRun = false, check = false } = options

  if (!workspaceRoot) {
    console.error('\n✗ Not inside an OWD workspace.\n')
    process.exit(1)
  }

  try {
    const result = await generateTemplate(workspaceRoot, { dryRun, check })
    if (check && result.ok === false) process.exit(1)
  } catch (error) {
    console.error(`\n✗ ${error.message ?? String(error)}\n`)
    process.exit(1)
  }
}
