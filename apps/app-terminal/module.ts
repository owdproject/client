import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addPlugin,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'

export default defineNuxtModule({
  meta: {
    name: 'owd-app-terminal',
    configKey: 'terminal',
  },
  defaults(nuxt) {
    return {
      welcomeMessage: `Welcome to Open Web Desktop!\nVersion: ${nuxt.options.runtimeConfig.public.desktop.coreVersion} - owdproject.org\n\nTo get started, try using the 'help' command\n\n`,
      prompt: 'owd$ ',
    }
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // set runtime config
    nuxt.options.appConfig.terminal = options

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
