import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const srcRoot = 'src'
const distRoot = 'dist'

function copyTree(srcDir, distDir) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name)
    const distPath = join(distDir, entry.name)

    if (entry.isDirectory()) {
      copyTree(srcPath, distPath)
      continue
    }

    if (entry.name.endsWith('.ts')) {
      continue
    }

    mkdirSync(dirname(distPath), { recursive: true })
    cpSync(srcPath, distPath)
  }
}

if (!existsSync(srcRoot)) {
  throw new Error(`Missing ${srcRoot}/ — run from package root`)
}

mkdirSync(distRoot, { recursive: true })
copyTree(srcRoot, distRoot)
