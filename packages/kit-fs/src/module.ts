import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core/runtime/utils/utilApp'

export default defineNuxtModule({
  meta: {
    name: 'owd-kit-fs',
    configKey: 'kitFs',
  },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addComponentsDir({
      path: resolve('./runtime/components'),
      prefix: 'KitFs',
    })

    addImportsDir(resolve('./runtime/composables'))
    addImportsDir(resolve('./runtime/stores'))

    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )
  },
})
