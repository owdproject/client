export default {
  id: 'org.owdproject.terminal',
  title: 'Terminal',
  category: 'tools',
  provides: {
    name: 'terminal',
    entry: 'terminal',
  },
  icon: 'mdi:console',
  windows: {
    main: {
      component: () => import('./components/Window/WindowTerminal.vue'),
      size: {
        width: 600,
        height: 400,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    terminal: {
      command: 'terminal',
    },
  },
  commands: {
    terminal: (app: IApplicationController) => {
      app.openWindow('main')
    },
  },
}
