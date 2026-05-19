import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-win11',
  apps: [ '@owdproject/app-about', '@owdproject/app-classic-audioplayer', '@owdproject/app-classic-videoplayer', '@owdproject/app-debug', '@owdproject/app-dino', '@owdproject/app-soundcloud', '@owdproject/app-terminal', '@owdproject/app-todo', '@owdproject/app-wasmboy', '@owdproject/app-youtube' ],
  modules: [ '@owdproject/module-fs', '@owdproject/module-persistence' ],
  fs: {
    mounts: {
      '/mnt/test': '/test.zip',
    },
  },
})
