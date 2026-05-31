export default defineNuxtConfig({
  workspaceDir: '../../',

  ssr: false,

  modules: ['@owdproject/core'],

  i18n: {
    strategy: 'no_prefix',
  },

  compatibilityDate: '2026-05-31',

  experimental: {
    viteEnvironmentApi: true,
  },
})
