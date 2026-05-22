import { isValidSoundcloudUrl } from './utils/utilSoundcloud'

export default {
  id: 'org.owdproject.soundcloud',
  title: 'SoundCloud',
  singleton: true,
  icon: 'simple-icons:soundcloud',
  windows: {
    main: {
      component: () => import('./components/Window/WindowSoundcloud.vue'),
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
  },
  entries: {
    soundcloud: {
      command: 'soundcloud --new --no-check',
    },
  },
  commands: {
    soundcloud: (app: IApplicationController, args: any) => {
      const url = args?._[1] || ''
      const forceNewWindow = args.new
      const doNotCheckUrlValidity = args.noCheck
      const autoplay = args.autoplay

      // validate input: must be a valid youtube url or a direct video id
      if (
        !doNotCheckUrlValidity &&
        !isValidSoundcloudUrl(url) &&
        !/^[a-zA-Z0-9_-]{11}$/.test(url)
      ) {
        return {
          message: 'SoundCloud URL or ID is not valid',
        }
      }

      // if --new is not passed, try to reuse an existing window of the same type
      const existingWindow = !forceNewWindow
        ? app.getFirstWindowByModel('main')
        : null

      if (existingWindow) {
        // update metadata of existing window
        existingWindow.meta.url = url
        existingWindow.meta.autoplay = url

        existingWindow.unminimize()
        existingWindow.focus()
        return
      }

      // open a new window if no reusable one exists or --new was passed
      app.openWindow('main', undefined, {
        url,
        autoplay,
      })
    },
  },
}
