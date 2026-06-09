import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { findWorkspaceRoot } from './workspace.js'

const SCOPE = '@owdproject/'

export const DESKTOP_CORE_PACKAGE = '@owdproject/core'

const REQUIRED_SCRIPTS = ['dev', 'dev:prepare', 'dev:generate', 'prepack']

/**
 * @param {string} pkgName
 */
export function isDesktopCorePackage(pkgName) {
  return pkgName === DESKTOP_CORE_PACKAGE
}

/**
 * @param {string} pkgName
 * @returns {'app' | 'theme' | 'module'}
 */
export function inferModuleKind(pkgName) {
  const short = pkgName.startsWith(SCOPE) ? pkgName.slice(SCOPE.length) : pkgName
  if (short.startsWith('app-')) return 'app'
  if (short.startsWith('theme-')) return 'theme'
  return 'module'
}

/**
 * Walk up from cwd until a package.json with @owdproject/ name is found.
 *
 * @param {string} [startDir]
 * @returns {string | null}
 */
export function findModulePackageRoot(startDir = process.cwd()) {
  let dir = resolve(startDir)
  for (;;) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath) && existsSync(join(dir, 'src', 'module.ts'))) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        if (typeof pkg.name === 'string' && pkg.name.startsWith(SCOPE)) {
          return dir
        }
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * @param {string} workspaceRoot
 * @returns {string[]}
 */
export function discoverOwdModulePackages(workspaceRoot) {
  const roots = []
  const scanDirs = [
    join(workspaceRoot, 'apps'),
    join(workspaceRoot, 'themes'),
    join(workspaceRoot, 'packages'),
  ]

  for (const base of scanDirs) {
    if (!existsSync(base)) continue
    for (const entry of readdirSync(base)) {
      const dir = join(base, entry)
      try {
        if (!statSync(dir).isDirectory()) continue
      } catch {
        continue
      }
      const pkgPath = join(dir, 'package.json')
      if (!existsSync(pkgPath)) continue
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        if (!pkg.name?.startsWith(SCOPE)) continue
        if (isDesktopCorePackage(pkg.name)) continue
        if (!existsSync(join(dir, 'src', 'module.ts'))) continue
        roots.push(dir)
      } catch {
        /* ignore */
      }
    }
  }

  return roots.sort()
}

/**
 * @param {string} content
 * @param {string} pkgName
 */
function desktopConfigReferencesPackage(content, pkgName, kind) {
  if (kind === 'app') {
    return (
      new RegExp(`apps\\s*:\\s*\\[[^\\]]*['"]${escapeRegExp(pkgName)}['"]`, 's').test(
        content,
      ) || new RegExp(`apps\\s*:\\s*\\[[^\\]]*${escapeRegExp(pkgName)}`, 's').test(content)
    )
  }
  if (kind === 'theme') {
    return (
      new RegExp(`theme\\s*:\\s*['"]${escapeRegExp(pkgName)}['"]`).test(content) ||
      new RegExp(`theme\\s*:\\s*${escapeRegExp(pkgName)}`).test(content)
    )
  }
  return (
    new RegExp(`modules\\s*:\\s*\\[[^\\]]*['"]${escapeRegExp(pkgName)}['"]`, 's').test(
      content,
    ) || new RegExp(`modules\\s*:\\s*\\[[^\\]]*${escapeRegExp(pkgName)}`, 's').test(content)
  )
}

/**
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {string} workspaceYaml
 * @param {string} playgroundRel
 */
function workspaceListsPlayground(workspaceYaml, playgroundRel) {
  const normalized = playgroundRel.replace(/\\/g, '/')
  const lines = workspaceYaml.split('\n')
  for (const line of lines) {
    const trimmed = line.trim().replace(/^-\s*/, '')
    if (!trimmed) continue
    if (trimmed === normalized) return true
    if (trimmed.endsWith('/*')) {
      const prefix = trimmed.slice(0, -2)
      if (normalized.startsWith(`${prefix}/`)) return true
    }
  }
  return false
}

/**
 * @typedef {object} ValidationIssue
 * @property {'error' | 'warning'} level
 * @property {string} code
 * @property {string} message
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} ok
 * @property {string} packageDir
 * @property {string} pkgName
 * @property {'app' | 'theme' | 'module'} kind
 * @property {ValidationIssue[]} errors
 * @property {ValidationIssue[]} warnings
 */

/**
 * @param {string} packageDir
 * @param {{ workspaceRoot?: string | null, requireDist?: boolean, strict?: boolean }} [options]
 * @returns {ValidationResult}
 */
export function validateOwdModule(packageDir, options = {}) {
  const dir = resolve(packageDir)
  const pkgPath = join(dir, 'package.json')
  /** @type {ValidationIssue[]} */
  const errors = []
  /** @type {ValidationIssue[]} */
  const warnings = []

  const issue = (level, code, message) => {
    ;(level === 'error' ? errors : warnings).push({ level, code, message })
  }

  if (!existsSync(pkgPath)) {
    return {
      ok: false,
      packageDir: dir,
      pkgName: '',
      kind: 'module',
      errors: [{ level: 'error', code: 'missing-package-json', message: 'package.json not found' }],
      warnings: [],
    }
  }

  /** @type {Record<string, unknown>} */
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return {
      ok: false,
      packageDir: dir,
      pkgName: '',
      kind: 'module',
      errors: [
        {
          level: 'error',
          code: 'invalid-package-json',
          message: 'package.json is not valid JSON',
        },
      ],
      warnings: [],
    }
  }

  const pkgName = typeof pkg.name === 'string' ? pkg.name : ''
  if (!pkgName.startsWith(SCOPE)) {
    issue('error', 'invalid-scope', `package name must start with ${SCOPE}`)
  }

  const kind = inferModuleKind(pkgName)
  const isCore = isDesktopCorePackage(pkgName)

  if (pkg.type !== 'module') {
    issue('error', 'type-module', 'package.json must set "type": "module"')
  }

  if (isCore) {
    const scripts = /** @type {Record<string, string>} */ (pkg.scripts ?? {})
    if (!scripts['dev:prepare']?.includes('nuxt-module-build')) {
      issue(
        'error',
        'dev-prepare-builder',
        'dev:prepare must run nuxt-module-build build --stub',
      )
    }
    if (!scripts['prepack']?.includes('nuxt-module-build')) {
      issue('error', 'prepack-builder', 'prepack must run nuxt-module-build build')
    }
    const devDeps = /** @type {Record<string, string>} */ (pkg.devDependencies ?? {})
    if (!devDeps['@nuxt/module-builder']) {
      issue(
        'error',
        'module-builder-dep',
        'devDependencies must include @nuxt/module-builder',
      )
    }
    const distModule = join(dir, 'dist', 'module.mjs')
    if (!existsSync(distModule)) {
      issue(
        options.requireDist ? 'error' : 'error',
        'dist-module',
        'dist/module.mjs missing — run: pnpm run dev:prepare',
      )
    }
    const ok =
      errors.length === 0 && (!options.strict || warnings.length === 0)
    return {
      ok,
      packageDir: dir,
      pkgName,
      kind,
      errors,
      warnings,
    }
  }

  const exports = /** @type {Record<string, unknown>} */ (pkg.exports ?? {})
  const rootExport = /** @type {Record<string, string> | undefined} */ (
    typeof exports['.'] === 'object' ? exports['.'] : undefined
  )
  if (rootExport?.import !== './dist/module.mjs') {
    issue(
      'error',
      'exports-import',
      'exports["."].import must be "./dist/module.mjs"',
    )
  }
  if (pkg.main !== './dist/module.mjs') {
    issue('error', 'main', 'main must be "./dist/module.mjs"')
  }
  const files = /** @type {string[] | undefined} */ (pkg.files)
  if (!Array.isArray(files) || !files.includes('dist')) {
    issue('error', 'files-dist', 'files must include "dist"')
  }

  const scripts = /** @type {Record<string, string>} */ (pkg.scripts ?? {})
  for (const script of REQUIRED_SCRIPTS) {
    if (!scripts[script]) {
      issue('error', `script-${script}`, `package.json scripts must include "${script}"`)
    }
  }
  if (scripts['dev:prepare'] && !scripts['dev:prepare'].includes('nuxt-module-build')) {
    issue(
      'error',
      'dev-prepare-builder',
      'dev:prepare must run nuxt-module-build (stub + prepare)',
    )
  }
  if (scripts['prepack'] && !scripts['prepack'].includes('nuxt-module-build')) {
    issue('error', 'prepack-builder', 'prepack must run nuxt-module-build build')
  }
  if (scripts.prepare) {
    issue(
      'error',
      'no-prepare-script',
      'Do not add a "prepare" script on publishable packages — it runs on npm publish/install and breaks release. Use "prepack" (full build) and "dev:prepare" (local stub + playground) only.',
    )
  }
  if (!rootExport?.development?.includes('src/module')) {
    issue(
      'warning',
      'exports-development',
      'exports["."].development should point to ./src/module.ts (monorepo dev without manual stub after every edit)',
    )
  }
  if (!scripts['dev:generate']?.includes('NUXT_APP_BASE_URL')) {
    issue(
      'warning',
      'dev-generate-base-url',
      'dev:generate should set NUXT_APP_BASE_URL=/<repo-slug>/ for GitHub Pages',
    )
  }

  const devDeps = /** @type {Record<string, string>} */ (pkg.devDependencies ?? {})
  if (!devDeps['@nuxt/module-builder']) {
    issue(
      'error',
      'module-builder-dep',
      'devDependencies must include @nuxt/module-builder',
    )
  }

  const peerDeps = /** @type {Record<string, string>} */ (pkg.peerDependencies ?? {})
  if (!peerDeps['@owdproject/core']) {
    issue(
      'warning',
      'peer-core',
      'peerDependencies should declare @owdproject/core',
    )
  }

  if (existsSync(join(dir, 'module.ts'))) {
    issue(
      'error',
      'legacy-module-root',
      'legacy layout: move module.ts to src/module.ts',
    )
  }
  if (existsSync(join(dir, 'runtime')) && !existsSync(join(dir, 'src', 'runtime'))) {
    issue(
      'error',
      'legacy-runtime-root',
      'legacy layout: move runtime/ under src/runtime/',
    )
  }

  const moduleTs = join(dir, 'src', 'module.ts')
  if (!existsSync(moduleTs)) {
    issue('error', 'src-module', 'src/module.ts is required')
  } else {
    const moduleSrc = readFileSync(moduleTs, 'utf8')
    if (!moduleSrc.includes('defineNuxtModule')) {
      issue('error', 'define-nuxt-module', 'src/module.ts must use defineNuxtModule')
    }
    const hasKitTailwind =
      moduleSrc.includes('registerTailwindPath') ||
      moduleSrc.includes('registerThemeTailwindPath')
    const hasKitPrimevue =
      moduleSrc.includes("installModule('@owdproject/kit-primevue'") ||
      moduleSrc.includes('installModule("@owdproject/kit-primevue"')
    if (kind === 'theme') {
      if (!hasKitPrimevue) {
        issue(
          'warning',
          'kit-primevue',
          'theme src/module.ts should install @owdproject/kit-primevue for PrimeVue + Tailwind',
        )
      }
      if (!hasKitTailwind) {
        issue(
          'warning',
          'tailwind-path',
          'theme src/module.ts should call registerThemeTailwindPath from @owdproject/kit-primevue/kit/registerTailwindPath',
        )
      }
    } else if (!hasKitTailwind) {
      issue(
        'warning',
        'tailwind-path',
        'src/module.ts should call registerTailwindPath from @owdproject/kit-primevue/kit/registerTailwindPath for Vue components',
      )
    }
  }

  const distModule = join(dir, 'dist', 'module.mjs')
  if (!existsSync(distModule)) {
    issue(
      options.requireDist ? 'error' : 'error',
      'dist-module',
      'dist/module.mjs missing — run: pnpm run dev:prepare',
    )
  }

  const playgroundDir = join(dir, 'playground')
  if (!existsSync(playgroundDir)) {
    issue('error', 'playground-dir', 'playground/ directory is required')
  } else {
    const pgPkgPath = join(playgroundDir, 'package.json')
    if (!existsSync(pgPkgPath)) {
      issue('error', 'playground-package-json', 'playground/package.json is required')
    } else {
      try {
        const pgPkg = JSON.parse(readFileSync(pgPkgPath, 'utf8'))
        const deps = {
          .../** @type {Record<string, string>} */ (pgPkg.dependencies ?? {}),
          .../** @type {Record<string, string>} */ (pgPkg.devDependencies ?? {}),
        }
        if (!deps[pkgName] && !deps[pkgName.replace(SCOPE, '')]) {
          issue(
            'error',
            'playground-self-dep',
            `playground/package.json must depend on ${pkgName}`,
          )
        }
        if (!deps['@owdproject/core']) {
          issue(
            'error',
            'playground-core-dep',
            'playground/package.json must depend on @owdproject/core',
          )
        }
        if (kind === 'app' && !deps['@owdproject/theme-nova']) {
          issue(
            'warning',
            'playground-theme-nova',
            'app playgrounds should use @owdproject/theme-nova in dependencies',
          )
        }
      } catch {
        issue('error', 'playground-package-json', 'playground/package.json is invalid JSON')
      }
    }

    const nuxtConfigPath = join(playgroundDir, 'nuxt.config.ts')
    if (!existsSync(nuxtConfigPath)) {
      issue('error', 'playground-nuxt-config', 'playground/nuxt.config.ts is required')
    } else {
      const nuxtCfg = readFileSync(nuxtConfigPath, 'utf8')
      if (!nuxtCfg.includes('@owdproject/core')) {
        issue(
          'error',
          'playground-nuxt-core',
          'playground/nuxt.config.ts must register @owdproject/core',
        )
      }
      if (!/\bssr\s*:\s*false\b/.test(nuxtCfg)) {
        issue('error', 'playground-ssr-false', 'playground/nuxt.config.ts must set ssr: false')
      }
    }

    const desktopConfigPath = join(playgroundDir, 'desktop.config.ts')
    if (!existsSync(desktopConfigPath)) {
      issue('error', 'playground-desktop-config', 'playground/desktop.config.ts is required')
    } else if (pkgName) {
      const desktopCfg = readFileSync(desktopConfigPath, 'utf8')
      if (!desktopConfigReferencesPackage(desktopCfg, pkgName, kind)) {
        const field = kind === 'app' ? 'apps' : kind === 'theme' ? 'theme' : 'modules'
        issue(
          'error',
          'playground-desktop-ref',
          `playground/desktop.config.ts must reference ${pkgName} in \`${field}\``,
        )
      }
      if (!desktopCfg.includes('defineDesktopConfig')) {
        issue(
          'error',
          'playground-define-config',
          'playground/desktop.config.ts must use defineDesktopConfig',
        )
      }
    }

    const appVuePath = join(playgroundDir, 'app', 'app.vue')
    if (!existsSync(appVuePath)) {
      issue('error', 'playground-app-vue', 'playground/app/app.vue is required')
    } else {
      const appVue = readFileSync(appVuePath, 'utf8')
      if (!/<Desktop\s*\/?>/.test(appVue) && !/<Desktop[\s>]/.test(appVue)) {
        issue(
          'error',
          'playground-desktop-component',
          'playground/app/app.vue must render <Desktop />',
        )
      }
    }

    const workspaceRoot = options.workspaceRoot ?? findWorkspaceRoot(dir)
    const relPkg =
      workspaceRoot != null ? relative(workspaceRoot, dir).replace(/\\/g, '/') : ''
    const isMonorepoModule =
      workspaceRoot != null &&
      /^(apps|themes|packages)\/[^/]+$/.test(relPkg) &&
      options.checkWorkspace !== false

    if (isMonorepoModule) {
      const wsPath = join(workspaceRoot, 'pnpm-workspace.yaml')
      if (existsSync(wsPath)) {
        const relPlayground = relative(workspaceRoot, playgroundDir)
        const wsYaml = readFileSync(wsPath, 'utf8')
        if (!workspaceListsPlayground(wsYaml, relPlayground)) {
          issue(
            'error',
            'workspace-playground',
            `add "${relPlayground}" to pnpm-workspace.yaml packages`,
          )
        }
      }
    }
  }

  if (kind === 'app') {
    const appConfigPath = join(dir, 'src', 'runtime', 'app.config.ts')
    if (!existsSync(appConfigPath)) {
      issue('error', 'app-config', 'src/runtime/app.config.ts is required for apps')
    }

    const pluginPath = join(dir, 'src', 'runtime', 'plugin.ts')
    if (!existsSync(pluginPath)) {
      issue('error', 'app-plugin', 'src/runtime/plugin.ts is required for apps')
    } else {
      const pluginSrc = readFileSync(pluginPath, 'utf8')
      if (!pluginSrc.includes('defineDesktopApp')) {
        issue('error', 'define-desktop-app', 'plugin.ts must call defineDesktopApp')
      }
      const hasDesktopRegister = /name\s*:\s*['"]desktop-[^'"]+-register['"]/.test(
        pluginSrc,
      )
      const hasLegacyRegister = /name\s*:\s*['"]owd-[^'"]+-register['"]/.test(
        pluginSrc,
      )
      if (!hasDesktopRegister && !hasLegacyRegister) {
        issue(
          'error',
          'plugin-name',
          'plugin.ts must set name: "desktop-<slug>-register" for dependsOn ordering',
        )
      } else if (!hasDesktopRegister && hasLegacyRegister) {
        issue(
          'warning',
          'plugin-name-legacy',
          'plugin.ts uses deprecated name "owd-<slug>-register"; rename to "desktop-<slug>-register"',
        )
      }
      if (!pluginSrc.includes('import.meta.server')) {
        issue(
          'warning',
          'plugin-server-guard',
          'plugin.ts should guard with if (import.meta.server) return',
        )
      }
    }

    const launchPlugins = existsSync(join(playgroundDir, 'app', 'plugins'))
      ? readdirSync(join(playgroundDir, 'app', 'plugins')).filter((f) =>
          /^launch-.*\.client\.ts$/.test(f),
        )
      : []
    if (launchPlugins.length === 0) {
      issue(
        'warning',
        'launch-plugin',
        'optional: add playground/app/plugins/launch-*.client.ts for dev auto-open',
      )
    }
  }

  if (!existsSync(join(dir, '.github', 'workflows', 'pages.yml'))) {
    issue(
      'warning',
      'pages-workflow',
      'optional for standalone repos: .github/workflows/pages.yml',
    )
  }

  const ok =
    errors.length === 0 && (!options.strict || warnings.length === 0)

  return {
    ok,
    packageDir: dir,
    pkgName,
    kind,
    errors,
    warnings,
  }
}

/**
 * @param {ValidationResult} result
 * @param {{ json?: boolean }} [options]
 */
export function formatValidationReport(result, options = {}) {
  if (options.json) {
    return JSON.stringify(result, null, 2)
  }

  const lines = []
  const status = result.ok ? 'PASS' : 'FAIL'
  lines.push(`${status}  ${result.pkgName || result.packageDir}  (${result.kind})`)
  lines.push(`  ${result.packageDir}`)
  for (const e of result.errors) {
    lines.push(`  ✗ [${e.code}] ${e.message}`)
  }
  for (const w of result.warnings) {
    lines.push(`  ⚠ [${w.code}] ${w.message}`)
  }
  if (result.ok && result.warnings.length === 0) {
    lines.push('  All checks passed.')
  }
  return lines.join('\n')
}

/**
 * @param {string} packageDir
 * @param {{ smoke?: boolean }} [options]
 */
export function runSmokeBuild(packageDir, options = {}) {
  if (!options.smoke) return { ok: true, message: '' }
  const dir = resolve(packageDir)
  try {
    execSync('pnpm run dev:prepare', { cwd: dir, stdio: 'pipe', encoding: 'utf8' })
    execSync('pnpm exec nuxt build playground', {
      cwd: dir,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 300_000,
    })
    return { ok: true, message: 'smoke build succeeded' }
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : String(error)
    return { ok: false, message: `smoke build failed: ${msg}` }
  }
}

/**
 * @param {string[]} paths
 * @param {{ workspaceRoot?: string | null, json?: boolean, strict?: boolean, smoke?: boolean }} [options]
 * @returns {{ exitCode: number, results: ValidationResult[] }}
 */
export function runValidateCli(paths, options = {}) {
  const workspaceRoot = options.workspaceRoot ?? findWorkspaceRoot() ?? null
  /** @type {string[]} */
  let targets = []

  if (paths.length === 0) {
    const fromCwd = findModulePackageRoot()
    if (fromCwd) {
      targets = [fromCwd]
    } else if (workspaceRoot) {
      targets = discoverOwdModulePackages(workspaceRoot)
    }
  } else {
    for (const p of paths) {
      const resolved = resolve(p)
      if (existsSync(join(resolved, 'package.json'))) {
        targets.push(resolved)
      } else if (workspaceRoot && (p === 'apps' || p === 'themes' || p === 'packages')) {
        const base = join(workspaceRoot, p)
        if (existsSync(base)) {
          targets.push(...discoverOwdModulePackages(workspaceRoot).filter((t) =>
            t.startsWith(base),
          ))
        }
      } else {
        targets.push(resolved)
      }
    }
  }

  if (targets.length === 0) {
    return {
      exitCode: 1,
      results: [
        {
          ok: false,
          packageDir: process.cwd(),
          pkgName: '',
          kind: 'module',
          errors: [
            {
              level: 'error',
              code: 'no-target',
              message:
                'No package to validate. Run from an @owdproject/* package or pass a path.',
            },
          ],
          warnings: [],
        },
      ],
    }
  }

  /** @type {ValidationResult[]} */
  const results = []
  let exitCode = 0

  for (const dir of [...new Set(targets)]) {
    const result = validateOwdModule(dir, {
      workspaceRoot,
      requireDist: true,
      strict: options.strict,
    })

    if (options.smoke && result.pkgName && !isDesktopCorePackage(result.pkgName)) {
      const smoke = runSmokeBuild(dir, { smoke: true })
      if (!smoke.ok) {
        result.errors.push({
          level: 'error',
          code: 'smoke-build',
          message: smoke.message,
        })
        result.ok = false
      }
    }

    results.push(result)
    if (!result.ok) exitCode = 1
  }

  return { exitCode, results }
}
