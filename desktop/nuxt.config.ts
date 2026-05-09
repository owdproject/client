export default defineNuxtConfig({
  workspaceDir: '../../',

  ssr: false,

  devServer: {
    host: '127.0.0.1',
  },

  modules: ['@owdproject/core'],

  i18n: {
    strategy: 'no_prefix',
  },

  compatibilityDate: '2025-05-15',

  devtools: {
    enabled: false,
  },

  experimental: {
    viteEnvironmentApi: true,
  },
})
