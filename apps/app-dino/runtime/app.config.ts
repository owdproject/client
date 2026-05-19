export default {
  id: 'org.owdproject.dino',
  title: 'Dino',
  category: 'games',
  singleton: true,
  icon: 'mdi:dinosaur-pixel',
  windows: {
    main: {
      component: () => import('./components/Window/WindowDino.vue'),
      resizable: true,
      maximizable: true,
      size: {
        minWidth: 640,
        minHeight: 300,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    dino: {
      command: 'dino',
    },
  },
  commands: {
    dino: (app: IApplicationController) => {
      app.openWindow('main')
    },
  },
}
