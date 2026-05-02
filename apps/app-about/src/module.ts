import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addPlugin,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'

export default defineNuxtModule({
  meta: {
    name: 'owd-app-about',
    configKey: 'about'
  },
  defaults: {
    title: 'Open Web Desktop',
    subtitle: 'github.com/owdproject/client',
    href: 'https://github.com/owdproject/client',
    versionText: 'v{owdVersion} + Nuxt {nuxtVersion}',
    icons: []
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const coreVersion =
      nuxt.options.runtimeConfig.public.desktop?.coreVersion ?? '?.?'

    options.versionText = options.versionText
      .replace('{owdVersion}', coreVersion)
      .replace('{nuxtVersion}', nuxt._version || 'unknown')

    if (!options.icons || Array.isArray(options.icons) && options.icons.length === 0) {
      options.icons = [
        {
          title: 'Vue.js',
          name: 'simple-icons:vuedotjs',
          size: 18,
          style: 'margin: 3px -5px 0 0'
        },
        {
          title: 'Nuxt.js',
          name: 'simple-icons:nuxt',
          size: 25,
          style: 'margin-top: -1px'
        },
        {
          title: 'TypeScript',
          name: 'simple-icons:typescript',
          size: 18,
          style: 'margin-top: 3px'
        },
        {
          title: 'PrimeVue',
          name: 'simple-icons:primevue',
          size: 18,
          style: 'margin-top: 3px'
        },
        {
          title: 'Tailwind CSS',
          name: 'simple-icons:tailwindcss',
          size: 18,
          style: 'margin-top: 3px'
        }
      ]
    }

    nuxt.options.runtimeConfig.public.desktop ??= {}
    nuxt.options.runtimeConfig.public.desktop.about = options

    {
      // add components

      addComponentsDir({
        path: resolve('./runtime/components'),
      })
    }

    {
      // add plugins

      addPlugin(resolve('./runtime/plugin'))
    }

    {
      // configure tailwind

      registerTailwindPath(
        nuxt,
        resolve('./runtime/components/**/*.{vue,mjs,ts}'),
      )
    }
  },
})