export default defineNuxtConfig({
  modules: ['@owdproject/core'],
  app: { baseURL: process.env.NUXT_APP_BASE_URL || '/' },
  i18n: { strategy: 'no_prefix' },
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  ssr: false,
})
