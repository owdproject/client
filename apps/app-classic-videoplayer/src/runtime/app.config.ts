export default {
  id: 'org.owdproject.classic-videoplayer',
  title: 'Player',
  singleton: false,
  icon: 'mdi:movie-open-outline',
  provides: {
    name: 'video-player',
    entry: 'player',
  },
  windows: {
    main: {
      component: () => import('./components/Window/WindowVideoPlayer.vue'),
      resizable: true,
      size: {
        width: '400px',
        height: 'auto',
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
      command: 'classic-videoplayer',
    },
  },
  commands: {
    'classic-videoplayer': (app: IApplicationController, args: any) => {
      const path = args._[1];
      const autoplay = args.autoplay
      const loop = args.loop

      const meta = args ? {
        path,
        autoplay,
        loop,
      } : {
        path: '/',
        autoplay: false,
        loop: false,
      }

      app.openWindow('main', undefined, meta)
    },
  },
}
