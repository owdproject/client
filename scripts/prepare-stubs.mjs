import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const roots = ['packages', 'apps', 'themes']
const packagesToStub = []

for (const root of roots) {
  if (!fs.existsSync(root)) continue
  const dirs = fs.readdirSync(root)
  
  for (const dir of dirs) {
    const pkgPath = path.join(root, dir)
    const packageJsonPath = path.join(pkgPath, 'package.json')
    const distPath = path.join(pkgPath, 'dist')
    
    // If it is a package directory and dist is missing, check if it needs stubbing
    if (fs.existsSync(packageJsonPath) && !fs.existsSync(distPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const hasBuilder = 
          (pkg.dependencies && pkg.dependencies['@nuxt/module-builder']) ||
          (pkg.devDependencies && pkg.devDependencies['@nuxt/module-builder']) ||
          (pkg.dependencies && pkg.dependencies['nuxt-module-build']) ||
          (pkg.devDependencies && pkg.devDependencies['nuxt-module-build'])
          
        if (hasBuilder) {
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
} else {
  console.log('[OWD] All workspace stubs are up to date.')
}
