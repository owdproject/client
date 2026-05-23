import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
} from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core/runtime/utils/utilApp'

export default defineNuxtModule({
  meta: {
    name: 'owd-kit-theme',
    configKey: 'kitTheme',
  },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addComponentsDir({
      path: resolve('./runtime/components'),
      prefix: 'KitTheme',
    })

    addImportsDir(resolve('./runtime/composables'))

    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )
  },
})
