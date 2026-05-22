import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  findOwdModulePackageRoot,
  hasPlaygroundDesktopConfig,
  resolveDevTarget,
  devSpawnCwd,
  devTargetLogLabel,
} from '../bin/lib/playgroundContext.js'

function writePkg(dir, name) {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name, type: 'module' }, null, 2),
  )
}

function writePlayground(dir) {
  mkdirSync(join(dir, 'playground'), { recursive: true })
  writeFileSync(join(dir, 'playground', 'desktop.config.ts'), 'export default {}')
}

describe('playgroundContext', () => {
  /** @type {string[]} */
  let tempDirs = []

  beforeEach(() => {
    tempDirs = []
  })

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  function makeWorkspaceTree() {
    const root = mkdtempSync(join(tmpdir(), 'owd-ws-'))
    tempDirs.push(root)
    writeFileSync(join(root, 'pnpm-workspace.yaml'), '')
    writeFileSync(join(root, 'nx.json'), '{}')

    const desktop = join(root, 'desktop')
    mkdirSync(desktop, { recursive: true })
    writePkg(desktop, '@owdproject/client')

    const appAbout = join(root, 'apps', 'app-about')
    mkdirSync(appAbout, { recursive: true })
    writePkg(appAbout, '@owdproject/app-about')
    writePlayground(appAbout)

    return { root, desktop, appAbout }
  }

  it('detects playground desktop.config.ts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'owd-pkg-'))
    tempDirs.push(dir)
    writePkg(dir, '@owdproject/app-example')
    writePlayground(dir)
    expect(hasPlaygroundDesktopConfig(dir)).toBe(true)
  })

  it('findOwdModulePackageRoot walks up from nested cwd', () => {
    const { appAbout } = makeWorkspaceTree()
    const nested = join(appAbout, 'src', 'runtime')
    mkdirSync(nested, { recursive: true })
    expect(findOwdModulePackageRoot(nested)).toBe(appAbout)
  })

  it('resolveDevTarget uses workspace at monorepo root', () => {
    const { root } = makeWorkspaceTree()
    const target = resolveDevTarget(root, root)
    expect(target.mode).toBe('workspace')
    expect(devSpawnCwd(target)).toBe(root)
    expect(devTargetLogLabel(target)).toBe('workspace desktop')
  })

  it('resolveDevTarget uses workspace under desktop/', () => {
    const { root, desktop } = makeWorkspaceTree()
    const target = resolveDevTarget(desktop, root)
    expect(target.mode).toBe('workspace')
  })

  it('resolveDevTarget uses playground inside app package', () => {
    const { root, appAbout } = makeWorkspaceTree()
    const target = resolveDevTarget(appAbout, root)
    expect(target.mode).toBe('playground')
    expect(target.packageName).toBe('@owdproject/app-about')
    expect(devSpawnCwd(target)).toBe(appAbout)
    expect(devTargetLogLabel(target)).toContain('app-about')
  })

  it('resolveDevTarget uses playground from playground subfolder', () => {
    const { root, appAbout } = makeWorkspaceTree()
    const pg = join(appAbout, 'playground')
    const target = resolveDevTarget(pg, root)
    expect(target.mode).toBe('playground')
  })

  it('forcePlayground returns null when no module package', () => {
    const { root } = makeWorkspaceTree()
    expect(resolveDevTarget(root, root, { forcePlayground: true })).toBeNull()
  })

  it('forcePlayground from root still fails without package in ancestry', () => {
    const { root, appAbout } = makeWorkspaceTree()
    const target = resolveDevTarget(root, root, { forcePlayground: true })
    expect(target).toBeNull()
    const fromApp = resolveDevTarget(appAbout, root, { forcePlayground: true })
    expect(fromApp.mode).toBe('playground')
  })

  it('ignores @owdproject packages without playground config', () => {
    const { root } = makeWorkspaceTree()
    const bare = join(root, 'apps', 'app-bare')
    mkdirSync(bare, { recursive: true })
    writePkg(bare, '@owdproject/app-bare')
    const target = resolveDevTarget(bare, root)
    expect(target.mode).toBe('workspace')
  })
})
