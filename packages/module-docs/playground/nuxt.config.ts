import { fileURLToPath } from 'node:url'

const h3Entry = fileURLToPath(
  new URL('./node_modules/h3/dist/index.mjs', import.meta.url),
)

export default defineNuxtConfig({
  modules: ['@owdproject/core'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
  },
  i18n: {
    strategy: 'no_prefix',
  },
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  ssr: false,
  vite: {
    resolve: {
      alias: {
        h3: h3Entry,
      },
    },
    optimizeDeps: {
      include: ['h3'],
    },
  },
  nitro: {
    externals: {
      inline: ['h3'],
    },
  },
})
