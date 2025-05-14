export default defineNuxtConfig({
  workspaceDir: '../../',
  devServer: {
    host: "127.0.0.1",
  },

  modules: [
    '@owdproject/core',
  ],

  i18n: {
    strategy: 'no_prefix',
  },

  future: {
    compatibilityVersion: 4,
  },

  devtools: {
    enabled: false,
  }
})
