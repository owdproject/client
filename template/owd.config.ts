import AppAbout from 'owd-app-about/owd.config'

export const owdConfig = {
    theme: './dev/themes/theme-win95',

    apps: [
        './node_modules/owd-app-about',
    ],

    loader: async () => {
        await defineDesktopApp(AppAbout)
    }
}