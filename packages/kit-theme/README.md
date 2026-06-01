<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">Kit Theme</h1>
<h3 align="center">
  Shared shell patterns for Open Web Desktop themes (neutral composables, no visual chrome).
</h3>

<br />

## Overview

`@owdproject/kit-theme` is an **optional** layer for OWD themes: **neutral composable names** and repeated **desktop shell** behaviour so Win95, Win11, GNOME-style themes, etc. supply **chrome only** (CSS, icons, layout, i18n)—not duplicated session, routing, or dialog wiring.

This package does **not** ship UI components or filesystem primitives; see **`kit-fs`** / **`kit-explorer`** for explorer UI.

### What lives here

| Area | Purpose |
|------|---------|
| **`useDesktopShellIdentity`** | Shell user identity (display name, avatar, VFS home). Defaults to Guest; auth modules call `setShellIdentity` after login. |
| **`useDesktopSession`** | End-of-session flow (e.g. shutdown animation → navigate to the theme’s `/start` route). |
| **`useDesktopShellOptions`** | Read `runtimeConfig` / `appConfig` for `desktop.systemBar` (enabled, position, start button). |
| **`useBlockNonInputContextMenu`** | Disable browser context menu on non-input elements (desktop shell–style). |
| **`useWorkspaceEdgeDrop`** | Drag a window to the left/right screen edge to move it to an adjacent virtual desktop (shared state + drop). |
| **`useWorkspaceEdgeDropWindowHandlers`** | Wire `useWorkspaceEdgeDrop` to theme `Window.vue` (`@drag:start` / `@drag:end` on `DesktopWindow`). |
| **`WorkspaceEdgeHintsBase`** | Headless edge overlay; themes supply slots for labels/chrome. |
| **`useWorkspaceOverviewLiveScale`** | Fit live DOM desktop roots into overview cards (`ResizeObserver` + dynamic `transform: scale`). |
| **`useWorkspaceOverviewCapture`** | JPEG snapshots per workspace while overview is open (`html2canvas` optional dep). |
| **`createDesktopDialogs`** | Build a `DesktopDialogProvider` from a Confirm service (themes wire this in a client plugin). |
| **`useDesktopDialogs`** | Resolve the active dialog provider (theme) or browser fallback. |

Composables under `runtime/composables/` are **auto-imported** when the Nuxt module loads. `createDesktopDialogs` lives under `runtime/dialogs/` and is **imported explicitly** in theme plugins.

### Relationship to `kit-fs` / `kit-explorer`

These packages are **orthogonal**:

- **`kit-theme`** — desktop shell helpers (session, system bar options, context-menu guard, PrimeVue dialog bridge).
- **`kit-fs`** — filesystem explorer **UI primitives** (`KitFs*` components, selectable area).
- **`kit-explorer`** — explorer **behaviour** + headless chrome bases; it **installs `kit-fs`** automatically.

A theme may depend on **`kit-theme`** only, or **`kit-theme`** + **`kit-explorer`** (+ **`module-fs`**) together—there is no automatic dependency between `kit-theme` and `kit-fs`.

### What stays in each theme

Start menu, taskbar, window borders, wallpapers, i18n, assets, and dialog markup/skin (e.g. `<ConfirmDialog />` groups with theme-specific templates/CSS).

## Installation

```bash
pnpm desktop add @owdproject/kit-theme
```

Peers: **`vue`**, **`nuxt`**, **`@owdproject/core`** (match versions with your client workspace).

## Usage

### Theme module (`module.ts`)

Install the Nuxt module so composables are registered:

```ts
await installModule('@owdproject/kit-theme')
```

### Composables (auto-import)

Use in theme components without manual registration:

```ts
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useDesktopShellIdentity } from '@owdproject/kit-theme/runtime/composables/useDesktopShellIdentity'
import { useDesktopShellOptions } from '@owdproject/kit-theme/runtime/composables/useDesktopShellOptions'
import { useBlockNonInputContextMenu } from '@owdproject/kit-theme/runtime/composables/useBlockNonInputContextMenu'
```

#### `useDesktopShellIdentity`

Neutral shell user for display and per-user VFS paths (e.g. recent files under `{userHome}/.local/share/`).

- **Defaults:** Guest user (`userId: 'guest'`, `displayName: 'Guest'`, `userHome` from `runtimeConfig.public.desktop.fs.defaultUserHome` or `/home/Guest`).
- **`setShellIdentity(partial)`** — call after login from an auth module to set `userId`, `displayName`, `avatarUrl`, `userHome`.
- **`clearShellIdentity()`** — reset to Guest.
- **Helpers:** `userHomeFromHandle(handle)` and `sanitizeUserHomeSegment()` for deriving home paths from handles (e.g. `@alice.bsky.social`).

Used by `@owdproject/module-fs` (`useFsRecentFiles`) and theme-specific UI (e.g. Win11 Start menu footer).

```ts
const { displayName, avatarUrl, userHome, setShellIdentity } = useDesktopShellIdentity()
```

(Depending on Nuxt auto-import settings, you may omit imports where symbols are globally available.)

### PrimeVue dialog bridge (explicit import)

Wire core’s dialog provider in a **client plugin** after `useConfirm` is available:

```ts
import { createDesktopDialogs } from '@owdproject/kit-theme/runtime/dialogs/createDesktopDialogs'
```

Themes still mount PrimeVue `<ConfirmDialog />` groups (`delete`, `about`, …) with their own styling.

### Workspace overview (live vs snapshot)

Use with core’s `useWorkspaceManager` for drop/keyboard behaviour in overview.

**Live DOM (recommended for animated previews):** pass a ref to the shell stage (area under the system bar, above the dock):

```ts
import { useWorkspaceOverviewLiveScale } from '@owdproject/kit-theme/runtime/composables/useWorkspaceOverviewLiveScale'

const shellStageRef = ref<HTMLElement | null>(null)
const { innerOverviewStyle } = useWorkspaceOverviewLiveScale(shellStageRef)
// On each card viewport: :style="innerOverviewStyle(viewportEl, { transformOrigin: 'top center' })"
```

**Static JPEG thumbnails:** `useWorkspaceOverviewCapture` + optional **`html2canvas`** in the desktop app.

### Workspace overview thumbnails (snapshot path)

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useWorkspaceManager } from '@owdproject/core'
import { useWorkspaceOverviewCapture } from '@owdproject/kit-theme/runtime/composables/useWorkspaceOverviewCapture'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { onWorkspaceDragOver, onWorkspaceDrop } = useWorkspaceManager()

const workspaceRoots = useTemplateRef<Record<string, HTMLElement>>('workspaceRoots')

const { thumbnails, thumbnailFor, isCapturing } = useWorkspaceOverviewCapture(
  (workspaceId) => workspaceRoots.value?.[workspaceId] ?? null,
)
</script>

<template>
  <div v-if="desktopWorkspaceStore.overview" class="owd-workspace-overview">
    <button
      v-for="id in desktopWorkspaceStore.list"
      :key="id"
      type="button"
      @click="desktopWorkspaceStore.setWorkspace(id)"
      @dragover="onWorkspaceDragOver"
      @drop="onWorkspaceDrop($event, id)"
    >
      <img v-if="thumbnailFor(id)" :src="thumbnailFor(id)" alt="" />
      <span v-else-if="isCapturing">…</span>
    </button>
  </div>
  <!-- One capture root per workspace (hidden or scaled); bind ref into workspaceRoots -->
</template>
```

Low-level DOM capture lives in `runtime/utils/captureElementToCanvas.ts` (internal; prefer the composable).

### Integration notes

- Keep **visual** and **copy** in the theme; keep **reusable shell mechanics** here when they repeat across themes.
- Align **`@owdproject/core`** with the desktop app—dialog types live in this kit (`DesktopDialogProvider`).
- **`defineDesktopConfig`** does not need to list `kit-theme` unless your orchestration expects it as an explicit module entry; **`installModule` from the theme `module.ts`** is the usual pattern.

## License

The module is released under the [MIT License](LICENSE).
