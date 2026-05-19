<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Persistence Module</h1>
<h3 align="center">
  Pinia persistence for Open Web Desktop (IndexedDB via idb-keyval).
</h3>

## Overview

This module registers [`pinia-plugin-persistedstate-2`](https://github.com/wobsoriano/pinia-plugin-persistedstate-2) with storage backed by [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (small ESM library on IndexedDB). It avoids legacy UMD packages such as `localforage`, which break under Vite’s native ESM handling (`does not provide an export named 'default'`).

## Features

- Async `getItem` / `setItem` / `removeItem` compatible with the persisted-state plugin
- Client-only Nuxt plugin (same pattern as before)

## Installation

In the client monorepo, depend on the workspace package and add it to `owd.config.ts` → `modules`:

```json
"@owdproject/module-persistence": "workspace:*"
```

```ts
modules: ['@owdproject/module-persistence'],
```

## License

This module is released under the [MIT License](LICENSE).
