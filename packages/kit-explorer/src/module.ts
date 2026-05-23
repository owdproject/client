import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  installModule,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core/runtime/utils/utilApp'

export default defineNuxtModule({
  meta: {
    name: 'owd-kit-explorer',
    configKey: 'kitExplorer',
  },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    await installModule('@owdproject/kit-fs')

    addComponentsDir({
      path: resolve('./runtime/components'),
      prefix: 'KitExplorer',
    })

    addImportsDir(resolve('./runtime/composables'))

    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )
  },
})
