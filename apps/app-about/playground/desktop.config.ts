import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-nova',
  apps: ['@owdproject/app-about'],
  modules: [],
  systemBar: {
    enabled: true,
    startButton: true,
  },
  about: {
    title: 'About (playground)',
    subtitle: 'app-about · theme-nova',
    href: 'https://github.com/owdproject/app-about',
    versionText: 'Nuxt Desktop',
    icons: [
      {
        title: 'Open Web Desktop',
        name: 'mdi:hexagon-multiple-outline',
        size: 24,
      },
      {
        title: 'Nuxt.js',
        name: 'simple-icons:nuxt',
        size: 25,
        style: 'margin-top: -1px',
      },
    ],
  },
})
