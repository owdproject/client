export default {
  id: 'org.owdproject.about',
  title: 'About',
  category: 'system-tools',
  singleton: true,
  icon: 'mdi:hexagon-multiple-outline',
  windows: {
    main: {
      component: () => import('./components/Window/WindowAbout.vue'),
      resizable: false,
      size: {
        width: 448,
        height: 240,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    about: {
      command: 'about',
    },
  },
  commands: {
    about: (app: IApplicationController) => {
      app.openWindow('main')
    },
  },
}
