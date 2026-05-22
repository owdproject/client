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
      const existing = app.getFirstWindowByModel('main')
      if (existing) {
        existing.actions.setActive(true)
        existing.actions.bringToFront()
        return existing
      }

      return app.openWindow('main')
    },
  },
}
