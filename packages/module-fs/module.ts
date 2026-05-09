import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import { deepMerge } from '@owdproject/core/runtime/utils/utilCommon'

export default defineNuxtModule({
  meta: {
    name: 'owd-module-fs',
    configKey: 'fs',
  },
  defaults: {
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
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    _nuxt.options.runtimeConfig.public.desktop.fs = deepMerge({
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

    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'client',
    })
  },
})
