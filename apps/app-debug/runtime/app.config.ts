export default {
  id: 'org.owdproject.debug',
  title: 'Debug',
  category: 'system-tools',
  icon: 'mdi:bug',
  windows: {
    main: {
      component: () => import('./components/Window/WindowDebug.vue'),
      resizable: true,
      size: {
        width: 400,
        minHeight: 500,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    debug: {
      command: 'debug',
    },
  },
  commands: {
    debug: (app) => {
      app.openWindow('main')
    },
  },
}
