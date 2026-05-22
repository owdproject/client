export default {
  id: 'org.owdproject.explorer',
  title: 'Files',
  singleton: false,
  icon: 'mdi:folder',
  provides: {
    name: 'explorer',
    entry: 'explorer',
  },
  windows: {
    main: {
      component: () => import('./components/Window/WindowExplorer.vue'),
      resizable: true,
      size: {
        width: 720,
        height: 520,
        minWidth: 560,
        minHeight: 440,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    explorer: {
      command: 'explorer /',
    },
  },
  commands: {
    explorer: (app: IApplicationController, args: unknown) => {
      const a = args as { _?: string[] } | undefined
      const pathArg = a?._?.[1]
      app.openWindow('main', undefined, { path: pathArg ?? '/' })
    },
  },
}
