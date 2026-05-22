export default {
  id: 'org.owdproject.wasmboy',
  title: 'WasmBoy',
  category: 'games',
  icon: 'streamline:gameboy',
  singleton: true,
  windows: {
    main: {
      component: () => import('./components/Window/WindowWasmboy.vue'),
      resizable: false,
      size: {
        width: 'auto',
        height: 'auto',
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
    manager: {
      component: () => import('./components/Window/WindowWasmboyManager.vue'),
      title: 'WasmBoy Manager',
      resizable: false,
      size: {
        width: 400,
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
    wasmboy: {
      command: 'wasmboy',
    },
    manager: {
      title: 'WasmBoy Manager',
      visibility: 'secondary',
      command: 'wasmboy manager',
    },
  },
  commands: {
    wasmboy: (app, args) => {
      handleCommand(app, args)
    },
    gameboy: (app, args) => {
      handleCommand(app, args)
    },
  },
}

function handleCommand(app: IApplicationController, args: any[]) {
  if (args.length === 1 && ['manager', 'settings'].includes(args[0])) {
    return app.openWindow('manager')
  }

  app.openWindow('main')
}
