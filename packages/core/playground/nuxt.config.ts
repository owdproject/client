export default defineNuxtConfig({
  modules: ['@owdproject/core'],
  i18n: {
    strategy: 'no_prefix',
  },
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  ssr: false,
})
