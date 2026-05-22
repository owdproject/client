#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { configs } from './migrateModulePlayground.config.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../')

function fixAppPlugin(pluginPath, registerName) {
  const raw = readFileSync(pluginPath, 'utf8')
  const configVar = raw.match(/import (config\w+) from/)?.[1] || 'configApp'
  writeFileSync(
    pluginPath,
    `import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import ${configVar} from './app.config'

export default defineNuxtPlugin({
  name: '${registerName}',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(${configVar})
  },
})
`,
  )
}

function buildLaunchPlugin(cfg) {
  const l = cfg.launch
  if (l.fsDemo) {
    return `import { nextTick } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { openVfsFile } from '@owdproject/module-fs/runtime/utils/utilFsOpenFile'

const APP_ID = '${l.appId}'

export default defineNuxtPlugin({
  name: '${l.pluginName}',
  dependsOn: ['${l.dependsOn}'],
  async setup(nuxtApp) {
    if (!import.meta.dev) return

    const applicationManager = useApplicationManager()

    async function runDemo() {
      if (!applicationManager.isAppDefined('org.owdproject.explorer')) return false
      await applicationManager.execAppCommand('org.owdproject.explorer', 'explorer /mnt/test')
      const opened = await openVfsFile('/mnt/test/demo.mp3')
      if (!opened && applicationManager.isAppDefined(APP_ID)) {
        await applicationManager.execAppCommand(APP_ID, ${JSON.stringify(l.command)})
      }
      return true
    }

    nuxtApp.hook('app:mounted', async () => {
      await nextTick()
      for (let i = 0; i < 80; i++) {
        if (await runDemo()) return
        await new Promise((r) => setTimeout(r, 50))
      }
    })
  },
})
`
  }

  return `import { nextTick } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const APP_ID = '${l.appId}'
const WINDOW_MODEL = 'main'

export default defineNuxtPlugin({
  name: '${l.pluginName}',
  dependsOn: ['${l.dependsOn}'],
  async setup(nuxtApp) {
    if (!import.meta.dev) return

    const applicationManager = useApplicationManager()

    async function surfaceWindow() {
      if (!applicationManager.isAppDefined(APP_ID)) return false
      const app = applicationManager.getAppById(APP_ID)!
      if (app.storeWindows.$persistedState) {
        await app.storeWindows.$persistedState.isReady()
      }
      app.closeAllWindows()
      app.storeWindows.windows = {}
      await applicationManager.execAppCommand(APP_ID, ${JSON.stringify(l.command)})
      const window = app.getFirstWindowByModel(WINDOW_MODEL)
      if (window) {
        window.actions.setActive(true)
        window.actions.bringToFront()
      }
      return Boolean(window)
    }

    nuxtApp.hook('app:mounted', async () => {
      await nextTick()
      await surfaceWindow()
    })

    for (let attempt = 0; attempt < 80; attempt++) {
      if (await surfaceWindow()) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  },
})
`
}

function buildPackageJson(cfg, old) {
  const slug = cfg.slug
  const deps = { '@nuxt/kit': '^4.3.0', ...(cfg.dependencies || {}) }
  const devDeps = {
    '@nuxt/module-builder': '^1.0.2',
    '@nuxt/schema': '^4.3.0',
    '@owdproject/core': 'workspace:*',
    '@owdproject/theme-nova': 'workspace:*',
    nuxt: '^4.3.0',
    typescript: '~5.9.3',
    ...(cfg.devDependencies || {}),
    ...(cfg.playgroundExtraDevDeps || {}),
  }

  const pkg = {
    name: cfg.name,
    version: old.version || cfg.version,
    description: old.description,
    keywords: old.keywords || cfg.keywords,
    license: old.license || 'MIT',
    homepage: old.homepage || `https://github.com/owdproject/${slug}`,
    author: old.author,
    type: 'module',
    exports: { '.': { types: './dist/types.d.mts', import: './dist/module.mjs' } },
    main: './dist/module.mjs',
    typesVersions: { '*': { '.': ['./dist/types.d.mts'] } },
    files: ['dist'],
    nx: { name: slug },
    scripts: {
      prepack: 'nuxt-module-build build',
      dev: 'pnpm run dev:prepare && cd playground && pnpm exec nuxt dev',
      'dev:build': 'nuxt build playground',
      'dev:generate': `NUXT_APP_BASE_URL=\${NUXT_APP_BASE_URL:-/${slug}/} nuxt generate playground`,
      'dev:prepare':
        'nuxt-module-build build --stub && nuxt-module-build prepare && cd playground && pnpm exec nuxt prepare',
      validate: 'desktop validate .',
    },
    dependencies: deps,
    devDependencies: devDeps,
    peerDependencies: old.peerDependencies || { '@owdproject/core': '^3.2.0' },
  }
  if (cfg.private || old.private) pkg.private = true
  if (old.peerDependenciesMeta) pkg.peerDependenciesMeta = old.peerDependenciesMeta
  return pkg
}

function buildPlaygroundPkg(cfg) {
  const deps = {
    '@owdproject/core': 'workspace:*',
    [cfg.name]: 'workspace:*',
    nuxt: '^4.4.4',
    ...(cfg.playgroundExtraDevDeps || {}),
  }
  if (!cfg.playgroundTheme) deps['@owdproject/theme-nova'] = 'workspace:*'
  if (cfg.playgroundTheme) deps[cfg.playgroundTheme] = 'workspace:*'
  return {
    name: `${cfg.name}-playground`,
    private: true,
    type: 'module',
    scripts: { dev: 'nuxt dev', build: 'nuxt build', generate: 'nuxt generate' },
    dependencies: deps,
  }
}

function buildDesktopConfig(cfg) {
  const theme = cfg.playgroundTheme || '@owdproject/theme-nova'
  const apps = cfg.playgroundApps || [cfg.name]
  const modules = cfg.playgroundModules || []
  let s = `import { defineDesktopConfig } from '@owdproject/core'\n\nexport default defineDesktopConfig({\n  theme: '${theme}',\n`
  if (apps.length) s += `  apps: [${apps.map((a) => `'${a}'`).join(', ')}],\n`
  if (modules.length) s += `  modules: [${modules.map((m) => `'${m}'`).join(', ')}],\n`
  s += '  systemBar: { enabled: true, startButton: true },\n'
  if (cfg.fsMounts) {
    s += '  fs: {\n    mounts: {\n'
    for (const [k, v] of Object.entries(cfg.fsMounts)) s += `      '${k}': '${v}',\n`
    s += '    },\n  },\n'
  }
  s += '})\n'
  return s
}

const NUXT = `export default defineNuxtConfig({
  modules: ['@owdproject/core'],
  app: { baseURL: process.env.NUXT_APP_BASE_URL || '/' },
  i18n: { strategy: 'no_prefix' },
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  ssr: false,
})
`

function pagesYml(slug) {
  return `name: Deploy playground to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npm i -g --force corepack@latest && corepack enable
      - run: npx nypm@latest i
      - run: npm run dev:prepare
      - run: npm run dev:generate
        env:
          NUXT_APP_BASE_URL: /${slug}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: playground/.output/public
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
`
}

function migrate(cfg) {
  const dir = join(ROOT, cfg.path)
  const src = join(dir, 'src')
  mkdirSync(src, { recursive: true })
  if (existsSync(join(dir, 'module.ts'))) renameSync(join(dir, 'module.ts'), join(src, 'module.ts'))
  if (existsSync(join(dir, 'runtime'))) renameSync(join(dir, 'runtime'), join(src, 'runtime'))

  const registerName = `${cfg.moduleName}-register`
  const pluginPath = join(src, 'runtime/plugin.ts')
  if (existsSync(pluginPath)) fixAppPlugin(pluginPath, registerName)

  const old = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(buildPackageJson(cfg, old), null, 2) + '\n')

  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        include: ['src/runtime', 'src/module.ts', '../../packages/core/types/index.d.ts'],
        exclude: ['dist', 'node_modules', 'playground'],
        compilerOptions: { outDir: 'dist' },
      },
      null,
      2,
    ) + '\n',
  )

  writeFileSync(
    join(dir, '.gitignore'),
    'node_modules\n.nuxt\ndist\n.output\nplayground/.nuxt\nplayground/node_modules\n._*\n',
  )

  const pg = join(dir, 'playground')
  mkdirSync(join(pg, 'app/plugins'), { recursive: true })
  writeFileSync(join(pg, 'nuxt.config.ts'), NUXT)
  writeFileSync(join(pg, 'tsconfig.json'), '{ "extends": "./.nuxt/tsconfig.json" }\n')
  writeFileSync(join(pg, 'package.json'), JSON.stringify(buildPlaygroundPkg(cfg), null, 2) + '\n')
  writeFileSync(join(pg, 'desktop.config.ts'), buildDesktopConfig(cfg))
  writeFileSync(join(pg, 'app/app.vue'), '<template>\n  <Desktop />\n</template>\n')
  if (cfg.launch) {
    writeFileSync(join(pg, 'app/plugins', cfg.launch.file), buildLaunchPlugin(cfg))
  }

  if (cfg.copyTestZip) {
    mkdirSync(join(pg, 'public'), { recursive: true })
    const srcZip = join(ROOT, 'desktop/public/test.zip')
    if (existsSync(srcZip)) copyFileSync(srcZip, join(pg, 'public/test.zip'))
  }

  if (cfg.pagesYml) {
    const wf = join(dir, '.github/workflows')
    mkdirSync(wf, { recursive: true })
    writeFileSync(join(wf, 'pages.yml'), pagesYml(cfg.slug))
  }

  console.log('OK', cfg.name)
}

for (const cfg of configs) migrate(cfg)
