import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

// todo this should be improved

const roots = ['packages', 'apps', 'themes']
const packagesToStub = []

for (const root of roots) {
  if (!fs.existsSync(root)) continue
  const dirs = fs.readdirSync(root)

  for (const dir of dirs) {
    const pkgPath = path.join(root, dir)
    const packageJsonPath = path.join(pkgPath, 'package.json')
    const distPath = path.join(pkgPath, 'dist')

    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const hasBuilder =
          (pkg.dependencies && pkg.dependencies['@nuxt/module-builder']) ||
          (pkg.devDependencies && pkg.devDependencies['@nuxt/module-builder']) ||
          (pkg.dependencies && pkg.dependencies['nuxt-module-build']) ||
          (pkg.devDependencies && pkg.devDependencies['nuxt-module-build'])

        if (hasBuilder) {
          // Clean the dist path to prevent issues with stale symlinks/files during stub build
          if (fs.existsSync(distPath)) {
            fs.rmSync(distPath, { recursive: true, force: true })
          }
          packagesToStub.push(pkgPath)
        }
      } catch (e) {
        console.warn(`Error reading ${packageJsonPath}:`, e.message)
      }
    }
  }
}

if (packagesToStub.length > 0) {
  console.log(`[OWD] Stubbing ${packagesToStub.length} packages:`, packagesToStub)

  // Build filter flags for pnpm
  const filters = packagesToStub.map(p => `--filter "./${p}"`).join(' ')
  execSync(`pnpm ${filters} exec nuxt-module-build build --stub`, { stdio: 'inherit' })

  // Post-stub assets copy
  for (const pkgPath of packagesToStub) {
    const srcI18n = path.join(pkgPath, 'src/i18n')
    const distI18n = path.join(pkgPath, 'dist/i18n')
    if (fs.existsSync(srcI18n)) {
      try {
        fs.cpSync(srcI18n, distI18n, { recursive: true })
      } catch (e) {
        console.warn(`Error copying i18n assets for ${pkgPath}:`, e.message)
      }
    }

    const srcPublic = path.join(pkgPath, 'public')
    const distPublic = path.join(pkgPath, 'dist/public')
    if (fs.existsSync(srcPublic)) {
      try {
        fs.cpSync(srcPublic, distPublic, { recursive: true })
      } catch (e) {
        console.warn(`Error copying public assets for ${pkgPath}:`, e.message)
      }
    }
  }
} else {
  console.log('[OWD] No packages to stub.')
}
