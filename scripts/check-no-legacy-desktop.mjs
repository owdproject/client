import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Blocks the deprecated *unscoped* `nuxt-desktop` package while allowing the current
 * distribution `@owdproject/nuxt-desktop`.
 *
 * - legacy: `nuxt-desktop`, `nuxt-desktop/...` (imports) and `"nuxt-desktop"` dependency key
 * - current: `@owdproject/nuxt-desktop` (must NOT be rejected)
 */
export const LEGACY_DESKTOP_PACKAGE = 'nuxt-desktop'
export const CURRENT_DESKTOP_PACKAGE = '@owdproject/nuxt-desktop'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ignored = new Set(['node_modules', 'dist', '.git', '.nuxt', '.output', '.data', '.cache'])
const seen = new Set()
const failures = []
// A quoted import specifier that is exactly `nuxt-desktop` or `nuxt-desktop/...`.
// `@owdproject/nuxt-desktop` is intentionally not matched: the character before the
// package name is `/`, not a quote.
const legacyImport = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]nuxt-desktop(?:\/|['"])/
let manifests = 0

/** Self-check: the guard must block legacy and allow the new scoped package. */
function assertGuardContract() {
  if (legacyImport.test(`import x from '${LEGACY_DESKTOP_PACKAGE}'`)) return
  console.error('Guard self-check failed: legacy nuxt-desktop import was not detected')
  process.exitCode = 1
}
assertGuardContract()

function scan(path) {
  if (!existsSync(path)) return
  const real = realpathSync(path)
  if (seen.has(real)) return
  seen.add(real)
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (!ignored.has(entry)) scan(join(path, entry))
    }
    return
  }
  if (path.endsWith('/package.json')) {
    manifests++
    const pkg = JSON.parse(readFileSync(path, 'utf8'))
    for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      if (pkg[key]?.[LEGACY_DESKTOP_PACKAGE]) failures.push(`${path}: ${key}.${LEGACY_DESKTOP_PACKAGE}`)
    }
  } else if (/\.(?:vue|[cm]?[jt]sx?)$/.test(path) && legacyImport.test(readFileSync(path, 'utf8'))) {
    failures.push(`${path}: imports the deprecated ${LEGACY_DESKTOP_PACKAGE} package`)
  }
}
for (const folder of ['apps', 'packages', 'themes', 'plugins', 'template', 'desktop']) scan(join(root, folder))
if (existsSync(join(root, 'packages/nuxt'))) {
  const enginePackages = resolve(realpathSync(join(root, 'packages/nuxt')), '..')
  for (const name of ['core', 'nuxt', 'vue', 'react', 'svelte', 'angular', 'astro', 'docs', 'fs']) scan(join(enginePackages, name))
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Verified ${manifests} package manifests and their sources: no ${LEGACY_DESKTOP_PACKAGE} dependency or import (allowing ${CURRENT_DESKTOP_PACKAGE})`,
  )
}
