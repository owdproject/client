// import mdi icons
require('@mdi/font/css/materialdesignicons.css')

// import all pages routes
import routesMain from '@/pages/main/routes'

// import modules configuration
import modulesConfig from '@/../config/modules.json'

export default {
  debug: false,

  // owd routes
  routes: [
    routesMain
  ],

  // owd modules
  modules: modulesConfig,

  // owd icons
  icons: {
    windows: {
      minimize: 'mdi-window-minimize',
      maximize: 'mdi-window-maximize',
      close: 'mdi-window-close',
      external: 'mdi-open-in-new'
    },
    systemBar: {
      battery: 'mdi-battery',
      'battery-0': 'mdi-battery-alert-variant-outline',
      'battery-20': 'mdi-battery-20',
      'battery-40': 'mdi-battery-40',
      'battery-60': 'mdi-battery-60',
      'battery-80': 'mdi-battery-80',
      'battery-100': 'mdi-battery'
    }
  },

  // vuetify config
  vuetify: {
    icons: {
      iconfont: 'mdiSvg'
    },
    rtl: false
  }
}
