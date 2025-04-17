import {defineDesktopApp} from "@owdproject/core"
import AppAbout from 'owd-app-about/owd.config'

export const owdConfig = {
    theme: ['github:owdproject/theme-win95', { install: true }],

    apps: [
       './node_modules/owd-app-about',
    ],

    loader: async () => {
        await defineDesktopApp(AppAbout)
    }
}