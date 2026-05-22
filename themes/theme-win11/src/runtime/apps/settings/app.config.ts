export default {
  id: 'org.owdproject.settings',
  title: 'Settings',
  singleton: true,
  icon: 'mdi:cog-outline',
  provides: {
    name: 'settings',
    entry: 'settings',
  },
  windows: {
    main: {
      component: () => import('./components/Window/WindowSettings.vue'),
      resizable: true,
      size: {
        width: 900,
        height: 600,
        minWidth: 640,
        minHeight: 480,
      },
      position: {
        x: 120,
        y: 80,
        z: 0,
      },
    },
  },
  entries: {
    settings: {
      command: 'settings',
    },
  },
  commands: {
    settings: (app: IApplicationController) => {
      app.openWindow('main')
    },
  },
}
