import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import { deepMerge } from '@owdproject/core/runtime/utils/utilCommon'

export default defineNuxtModule({
  meta: {
    name: 'owd-module-fs',
    configKey: 'fs',
  },
  defaults: {
    defaultUserHome: '/home/Guest',
    recentFiles: {
      relativePath: '.local/share/recently-used.json',
    },
    mounts: {},
    folders: {
      common: [
        '/Desktop',
        '/Documents',
        '/Downloads',
        '/Music',
        '/Pictures',
        '/Videos',
      ],
      extra: [],
      override: [],
    },
    fileAssociations: {
      mp4: 'video-player',
      webm: 'video-player',
      mp3: 'audio-player',
      txt: 'text-editor',
      gif: 'image-viewer',
      webp: 'image-viewer',
      jpg: 'image-viewer',
      png: 'image-viewer',
    }
  },
  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    _nuxt.options.runtimeConfig.public ??= {}
    _nuxt.options.runtimeConfig.public.desktop ??= {}
    _nuxt.options.runtimeConfig.public.desktop.fs = deepMerge({
      defaultUserHome: '/home/Guest',
      recentFiles: {
        relativePath: '.local/share/recently-used.json',
      },
      mounts: {
        '/home': 'WebStorage',
        '/.cache': 'InMemory',
        '/.trash': 'InMemory',
      },
      folders: {
        common: [
          '/Desktop',
          '/Documents',
          '/Downloads',
          '/Music',
          '/Pictures',
          '/Videos',
        ],
        extra: [],
        override: [],
      },
    }, _options)

    const docsInstalled = (_nuxt.options.modules ?? []).some((m) => {
      const id = String(m)
      return id.includes('module-docs') || id.includes('@owdproject/docs')
    })

    if (docsInstalled) {
      try {
        const { registerOwdDocsSource } = await import('@owdproject/module-docs/register')
        registerOwdDocsSource(_nuxt, {
          id: 'module-fs',
          cwd: resolve('./content'),
          include: 'docs/**',
          prefix: '/docs/modules/filesystem',
        })
      } catch {
        /* module-docs optional — skip in-repo docs registration */
      }
    }

    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'client',
    })
  },
})
