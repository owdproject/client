import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ignored = new Set(['node_modules', 'dist', '.git', '.nuxt', '.output', '.data', '.cache'])
const seen = new Set()
const failures = []
const legacyImport = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]nuxt-desktop(?:\/|['"])/
let manifests = 0

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
      if (pkg[key]?.['nuxt-desktop']) failures.push(`${path}: ${key}.nuxt-desktop`)
    }
  } else if (/\.(?:vue|[cm]?[jt]sx?)$/.test(path) && legacyImport.test(readFileSync(path, 'utf8'))) {
    failures.push(`${path}: imports the deprecated nuxt-desktop package`)
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
  console.log(`Verified ${manifests} package manifests and their sources: no nuxt-desktop dependency or import`)
}
