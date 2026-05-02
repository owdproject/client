# Filesystem layer audit (OWD)

Documento di mappatura per separare **VFS / integrazione** da **UI tema** e per il futuro pacchetto `@owdproject/kit-fs` sotto `client/packages/`.

## 1. Stack e bootstrap

| Pezzo | Ruolo |
|--------|--------|
| `module.ts` | Modulo Nuxt `owd-module-fs`: merge `runtimeConfig.public.desktop.fs` (mounts di default, `fileAssociations`), registra componenti + plugin client. |
| `runtime/plugin.ts` | Inizializza **ZenFS** (`configure` da `@zenfs/core` + backend `InMemory` / `WebStorage` / `IndexedDB` + `Zip` per archivi). I mount vengono da `public.desktop.fs.mounts`. |
| `@zenfs/core` | API `fs` (sync + `fs.promises`) usata dai composable. |

**Nota:** il plugin è marcato come prototipo (“should be improved todo”): gestione errori mount e tipi mount non-string minimali.

## 2. Confini: cosa sta dove

### Resta in `module-fs` (integrazione + logica FS riusabile)

- Montaggio ZenFS e **config** (`mounts`, `fileAssociations`).
- Composable “motore” che lavora su `fs` + clipboard FS + navigazione history + tastiera (generica).
- Utilità path/associazioni: `utilFileSystem.ts`, `utilFileSystemImage.ts`.
- ~~`SelectableArea.vue`~~ — spostato in `@owdproject/kit-fs` come `ExplorerSelectableArea` (`KitFsExplorerSelectableArea` in template).

### Nel tema oggi (Win95) — non nel modulo

- **`themes/theme-win95/runtime/composables/useFsController.ts`**: conferme **PrimeVue** (`useConfirm`), copy/paste con dialoghi, delete con testi i18n. È **accoppiato al look/dialog stack del tema**.
- **`apps/app-explorer`** (pacchetto `@owdproject/app-explorer`): shell finestra (menu, toolbar, layout “directory”), `WindowExplorer.vue`, registrazione app desktop via `defineDesktopApp`.

Il binding avviene in `WindowDirectory.vue`: importa `useFileSystemExplorer` da `@owdproject/module-fs` e inietta **`useFsController`** dal tema come factory (`useFileSystemExplorer(window, useFsController, t)`).

### Zona grigia (oggi in `module-fs`, da spostare o astrarre per `kit-fs`)

`useFileSystemExplorer.ts` (~400 righe) mescola:

- Operazioni pure su `fs` (open, rename logic via paste, trash su `/tmp`, symlink, selezione).
- **PrimeVue** `useConfirm` per `pasteShortcuts` (overwrite).
- **`useApplicationManager`** + **`storeDesktopDefaultApps`** per “apri file con app predefinita”.

Per `kit-fs` ha senso estrarre:

1. Un **core senza UI**: stato explorer (path, entries, selection), operazioni fs, clipboard paths, history back/forward — con **callback/injection** per confirm/prompt/alert.
2. Adapter tema: implementazione dialoghi (PrimeVue o futuro provider unico cross-tema).

## 3. Mappa file `packages/module-fs`

| Path | Contenuto |
|------|------------|
| `module.ts` | Definizione modulo, defaults fs |
| `runtime/plugin.ts` | ZenFS `configure` |
| `runtime/composables/useFileSystemExplorer.ts` | Orchestrazione explorer + dipendenze core/app |
| `useFileSystemClipboard.ts` | Clipboard cut/copy e paths |
| `useFileSystemDirectoryNavigation.ts` | History navigazione |
| `useFileSystemDirecorySelection.ts` | (nome typo: Directory) — selezione directory |
| `useFileSystemKeyboardActions.ts` | Scorciatoie quando la finestra è in focus |
| `runtime/utils/utilFileSystem.ts` | Associazioni estensione → app id |
| `runtime/utils/utilFileSystemImage.ts` | Helper immagini |
| ~~`runtime/components/SelectableArea.vue`~~ | Spostato in `@owdproject/kit-fs` (`ExplorerSelectableArea`) |

## 4. Issue note (non bloccanti per l’audit)

- **`useFileSystemKeyboardActions`**: per “cut” viene chiamato `onCopy()` invece di `onCut()` (ramo `keys.x` + ctrl).
- **`TRASH_PATH`**: hardcoded `'/tmp'` in `useFileSystemExplorer`; i mount di default usano `/.trash` in config — allineare con runtime config quando si rende il cestino configurabile.
- **`openDirectory`**: doppia assegnazione a `basePath` / doppia push navigazione in alcuni rami (da ripulire quando si refactora).
- **Prompt/alert**: `createNewDirectory`, `createSymbolicLink`, `operationUndo`, `fileProperties` usano `window.prompt` / `alert` — candidati forti a passare al **dialog provider** del tema/kit.

## 5. Piano verso `kit-fs` (in `packages/`)

1. Definire interfaccia **ExplorerSession** (o simile): path, entries, selected paths, azioni, senza PrimeVue.
2. Spostare logica fs pura + clipboard + navigation history nel pacchetto neutro.
3. Lasciare in `module-fs` solo: ZenFS plugin, config Nuxt, eventuali thin wrapper che re-exportano da `kit-fs`.
4. Temi: `useFsController` diventa thin layer che passa `confirm`/`prompt` conformi al contratto dialog unico (Win95 prima, poi altri).

## 6. Riferimento integrazione tema Win95

- App explorer: `apps/app-explorer/`
- Finestra directory: `themes/theme-win95/runtime/components/Window/WindowDirectory.vue`
- Controller dialoghi: `themes/theme-win95/runtime/composables/useFsController.ts`

Nessun altro tema nell’albero locale espone ancora `app-explorer` finché non sono aggiunti come workspace.
