<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">File System module</h1>
<h3 align="center">
    File System Module for Open Web Desktop.
</h3>

## Overview

This module enables a filesystem allowing [ZenFS](https://github.com/zen-fs/core) to be implemented in each theme or app.

## Features

- Implements a Node.js-like filesystem using `ZenFS`
- Allows different mounts like temp folders and zip files

## Installation

```bash
desktop add module-fs
```

## Configuration

You could set this configuration in `/desktop/owd.config.ts`:

```js
fs: {
  mounts: {
    '/music/meteora': '/meteora.zip',
    '/home': 'WebStorage',
    '/tmp': 'InMemory',
  },
},
```

If you are mounting zips, place them in your `/desktop/public` folder (served as `/filename.zip` from the app root, or under `app.baseURL` if you use a subpath). The module fetches the file on the client and rejects non-zip responses (e.g. HTML 404) before mounting.

If you see **“could not locate End of Central Directory signature”**, the downloaded bytes are not a valid ZIP (wrong URL, 404 page, empty file, or corrupt archive).

## License

This module is released under the [MIT License](LICENSE).
