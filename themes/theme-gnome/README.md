<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">GNOME Theme</h1>
<h3 align="center">
  GNOME Theme for your Open Web Desktop client.
</h3>

## Overview

This theme for Open Web Desktop recreates the Adwaita GNOME UI.

## Installation

1.  Navigate to your client folder in your terminal:

    ```bash
    cd owd-client
    ```

2.  Install the desktop module using npm or yarn:

    ```bash
    npm install @owdproject/theme-gnome
    ```

3.  Register the application in your desktop configuration file:

    ```typescript
    // owd.config.ts
    export default defineDesktopConfig({
      theme: '@owdproject/theme-gnome',
      apps: ['@owdproject/app-about'],
    })
    ```

## License

The application is released under the [MIT License](LICENSE).
