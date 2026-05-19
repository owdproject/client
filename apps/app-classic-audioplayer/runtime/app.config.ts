export default {
  id: 'org.owdproject.classic-audioplayer',
  title: 'Player',
  singleton: true,
  icon: 'mdi:volume-high',
  provides: {
    name: 'audio-player',
    entry: 'player',
  },
  windows: {
    main: {
      component: () => import('./components/Window/WindowAudioPlayer.vue'),
      destroyable: true,
      minimizable: true,
      resizable: true,
      size: {
        width: 360,
        height: 120,
        minWidth: 280,
        minHeight: 100,
      },
      position: {
        x: 400,
        y: 240,
        z: 0,
      },
    },
  },
  entries: {
    player: {
      command: 'classic-audioplayer',
    },
  },
  commands: {
    'classic-audioplayer': (app: IApplicationController, args: any) => {
      const path = args._[1]
      const meta = {
        path,
        autoplay: Boolean(args.autoplay),
        loop: Boolean(args.loop),
      }

      const opened = app.getWindowsByModel('main')
      for (let i = 1; i < opened.length; i++) {
        opened[i]!.destroy()
      }

      return app.openWindow('main', undefined, meta)
    },
  },
}
