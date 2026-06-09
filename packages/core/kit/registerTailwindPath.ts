import type { Nuxt } from '@nuxt/schema'

export function registerTailwindPath(nuxt: Nuxt, path: string) {
  nuxt.options.runtimeConfig.app.owd = nuxt.options.runtimeConfig.app.owd || {}
  nuxt.options.runtimeConfig.app.owd.tailwindPaths =
    nuxt.options.runtimeConfig.app.owd.tailwindPaths || []

  if (!nuxt.options.runtimeConfig.app.owd.tailwindPaths.includes(path)) {
    nuxt.options.runtimeConfig.app.owd.tailwindPaths.push(path)
  }
}
