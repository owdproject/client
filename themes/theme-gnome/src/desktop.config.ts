import { defineDesktopConfig } from '@owdproject/core/runtime/utils/utilDesktop'

export default defineDesktopConfig({
  name: 'gnome',

  systemBar: {
    enabled: true,
    position: 'top',
    startButton: false,
  },

  workspaces: {
    enabled: true,
  },
})
