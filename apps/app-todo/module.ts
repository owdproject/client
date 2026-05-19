import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  installModule,
  addPlugin,
  addImportsDir,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'

export default defineNuxtModule({
  meta: {
    name: 'owd-app-todo',
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.alias['owd-app-todo'] = resolve(__dirname, './runtime')

    {
      // add components

      addComponentsDir({
        path: resolve('./runtime/components'),
      })
    }

    {
      // add plugins

      addPlugin(resolve('./runtime/plugin'))

      // add other files

      addImportsDir(resolve('./runtime/stores'))
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
