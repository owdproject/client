<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Classic Audio Player</h1>
<h3 align="center">
  Audio Player for Open Web Desktop.
</h3>

<br />

## Overview

This app for Open Web Desktop provides a basic audio player for the File System module.

## Playground

Requires **`@owdproject/module-fs`** (and **`@owdproject/module-persistence`**) so VFS file associations work (`mp3` → `audio-player` via `openVfsFile`):

```bash
pnpm install
pnpm run dev:prepare
pnpm run dev
```

The playground mounts `playground/public/test-small.zip` at `/mnt/test` (demo file `demo.mp3`). In dev, a launch plugin opens Explorer on `/mnt/test` and triggers the mp3 association.

Static preview (GitHub Pages): `pnpm run dev:generate` → `NUXT_APP_BASE_URL=/app-classic-audioplayer/`

## Installation

```bash
pnpm desktop add @owdproject/app-classic-audioplayer
```

## Usage

#### Available commands

```
classic-audioplayer <url>
classic-audioplayer <url> --loop
classic-audioplayer <url> --autoplay
```

## License

The application is released under the [MIT License](LICENSE).
