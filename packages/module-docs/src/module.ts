import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  extendPages,
  installModule,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'
import { deepMerge } from '@owdproject/core/runtime/utils/utilCommon'
import {
  registerOwdDocsSource,
  type OwdDocsSource,
} from './registerOwdDocsSource'
import { writeOwdContentConfig } from './utils/writeContentConfig'

export interface DocsModuleUserSource {
  cwd: string
  prefix?: string
  include?: string
  exclude?: string[]
}

export interface DocsModuleOptions {
  basePath?: string
  title?: string
  sources?: DocsModuleUserSource[]
}

export default defineNuxtModule<DocsModuleOptions>({
  meta: {
    name: 'owd-module-docs',
    configKey: 'docs',
  },
  defaults: {
    basePath: '/docs',
    title: 'Open Web Desktop',
    sources: [],
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const basePath = options.basePath ?? '/docs'

    nuxt.options.build.transpile.push('@nuxt/content')

    registerOwdDocsSource(nuxt, {
      id: 'core',
      cwd: resolve('../content'),
      include: 'docs/**',
      prefix: basePath,
    })

    const projectContentDir = join(nuxt.options.rootDir, 'content')
    if (existsSync(projectContentDir)) {
      registerOwdDocsSource(nuxt, {
        id: 'project',
        cwd: projectContentDir,
        include: 'docs/**',
        prefix: basePath,
      })
    }

    for (const [index, source] of (options.sources ?? []).entries()) {
      const cwd = source.cwd.startsWith('/')
        ? source.cwd
        : join(nuxt.options.rootDir, source.cwd)

      registerOwdDocsSource(nuxt, {
        id: `user-${index}`,
        cwd,
        include: source.include ?? '**/*.md',
        prefix: source.prefix ?? basePath,
        exclude: source.exclude,
      })
    }

    writeOwdContentConfig(nuxt, basePath)

    nuxt.options.content = {
      ...nuxt.options.content,
      experimental: {
        ...nuxt.options.content?.experimental,
        sqliteConnector: 'native',
      },
    }

    await installModule('@nuxt/content')

    nuxt.hook('modules:done', async () => {
      writeOwdContentConfig(nuxt, basePath)
      await nuxt.callHook('content:update' as any)
    })

    nuxt.options.css.push(resolve('./runtime/assets/styles/docs.scss'))

    addComponentsDir({
      path: resolve('./runtime/components'),
      prefix: '',
      global: true,
    })

    addImportsDir(resolve('./runtime/composables'))

    const docsIndex = resolve('./runtime/pages/docs/index.vue')
    const docsSlug = resolve('./runtime/pages/docs/[...slug].vue')

    extendPages((pages) => {
      pages.push({
        name: 'owd-docs-index',
        path: basePath,
        file: docsIndex,
      })
      pages.push({
        name: 'owd-docs-slug',
        path: `${basePath}/:slug(.*)*`,
        file: docsSlug,
      })
    })

    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )

    nuxt.options.runtimeConfig.public.desktop ??= {}
    nuxt.options.runtimeConfig.public.desktop.docs = deepMerge(
      {
        basePath,
        title: options.title,
        installed: true,
      },
      options,
    )
  },
})
