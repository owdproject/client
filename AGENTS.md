# Open Web Desktop (OWD) — documentazione di contesto

Questo file descrive il **repository client** del progetto **Open Web Desktop**: obiettivo, architettura, cartelle, flussi di estensione e concetti da riusare nelle sessioni di lavoro (incluso supporto per assistenti AI). Per una chat nuova, includi `@AGENTS.md` così non serve ribadire la struttura ogni volta.

**Playbook moduli con playground** (migrazione legacy, `nuxt-module-build`, GitHub Pages): [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md) — in Cursor anche regola `.cursor/rules/owd-app-module-playground.mdc` su `apps/**` e `themes/**`.

**Posizionamento**: framework/modulo Nuxt per costruire **esperienze “desktop” nel browser** (finestre, barra, workspace), **modulare** (temi, moduli, app), pensato per essere **open source**, **riutilizzabile** e documentabile come prodotto **enterprise** — bootstrap rapido del shell desktop + creazione di nuovi moduli/app seguendo un pattern ripetibile.

---

## Visione in una frase

Un’unica app Nuxt (`desktop/`) carica **`@owdproject/core`**, che legge **`desktop.config.ts`**, installa in sequenza **tema → moduli opzionali → app**, e fornisce runtime (Pinia, gestione applicazioni/finestre, UI core). I temi personalizzano look & layout (il team li paragona a “sistemi operativi” lato UI); le app registrano programmi nel desktop tramite **`defineDesktopApp`**.

---

## Stack tecnico

| Layer | Scelta |
|--------|--------|
| Framework UI | **Vue 3**, **Nuxt 4** (nel client root spesso SPA: `ssr: false` sul desktop) |
| Monorepo | **pnpm** workspace + **Nx** (comandi `nx run desktop:…`) |
| Stato | **Pinia** |
| Styling | **Tailwind** + **PrimeVue** (+ tema PrimeVue via core) |
| Icone / font | **@nuxt/icon**, **@nuxt/fonts** |
| i18n | **@nuxtjs/i18n** |
| Estensioni app | Moduli Nuxt con **`@nuxt/module-builder`** → artefatto **`dist/module.mjs`** |

---

## Mappa del repository (root = `client/`)

```
client/
├── desktop/                 # Applicazione Nuxt “shell” del desktop (entry utente)
├── packages/core/           # Motore OWD — modulo Nuxt `@owdproject/core`
├── packages/module-fs/      # Modulo opzionale FS (ZenFS) — non è nel core
├── packages/kit-theme/      # Pattern shell neutri (sessione desktop, dialog PrimeVue, guard UI…)
├── packages/kit-fs/         # UI explorer neutra (`KitFs*`), da usare con `module-fs`
├── packages/kit-fs/         # UI neutra explorer (selezione, …) — opzionale
├── packages/kit-theme/      # Composable / pattern shell condivisi tra temi — opzionale
├── apps/                    # App desktop (es. `app-about`, `app-explorer`, …)
├── themes/                  # Temi (look & feel / “desktop environment” UI)
├── plugins/                 # Slot workspace per plugin Nuxt futuri (cartella opzionale)
├── template/                # Blueprint per `npm create owd` / progetti generati
├── package.json             # Script root: dev, generate, prepare:modules, …
├── pnpm-workspace.yaml
├── nx.json
└── AGENTS.md                # Questo file
```

**Convenzione cartelle (importante):** nel monorepo **non** esiste una directory top-level `client/modules/`. I pacchetti condivisi — `@owdproject/core`, moduli Nuxt opzionali come **`@owdproject/module-fs`**, **`@owdproject/kit-fs`**, ecc. — stanno sotto **`packages/*`**. Il campo **`modules`** in `desktop.config.ts` è solo la **lista di moduli Nuxt** da caricare (nomi pacchetto), non un percorso filesystem `modules/`.

### `desktop/` — shell del desktop

- **`nuxt.config.ts`**: registra `@owdproject/core`, opzioni Nuxt (host, i18n, `workspaceDir`, ecc.).
- **`desktop.config.ts`**: **config dichiarativa** del desktop (`defineDesktopConfig`): `theme`, `modules`, `apps` (nomi pacchetto risolti da pnpm).
- **`app/app.vue`**: radice minimale; monta il componente tema (es. `<Desktop />` dal tema attivo).
- Non contiene la logica finestra/app: delega a **core + tema + app caricate**.

### `packages/module-docs/` — `@owdproject/module-docs`

- Modulo Nuxt **opzionale**: documentazione in-app su `/docs` (Nuxt Content v3 + layout OWD compatibile con PrimeVue/Tailwind del desktop).
- Attivalo in **`desktop.config.ts` → `modules`** (prima dei moduli che estendono la doc, es. `module-fs`).
- Config opzionale: chiave top-level **`docs`** (`basePath`, `title`, `sources` per markdown aggiuntivo in `./content`).
- API **`registerOwdDocsSource(nuxt, { id, cwd, prefix, include })`** per aggiungere pagine da altri pacchetti (es. `module-fs` → `/docs/modules/filesystem/...`).
- TUI (`pnpm desktop`): **`[m]`** menu comandi; **`[s]`** start, **`[x]`** stop, **`[R]`** reboot del dev server; **`[w]`** salva il catalogo; se installato `module-docs`, **`[i]`** apre `/docs` nel browser.
- Alias deprecato: `@owdproject/docs` re-exporta `module-docs`.
- Sito pubblico **owd-docs** (repo sorella, Docus): può condividere gli stessi contenuti a medio termine; in-app non usa il layer Docus completo (conflitto stack con il core).

### `packages/module-fs/` — `@owdproject/module-fs`

- Modulo Nuxt **opzionale**: monta ZenFS e fornisce composable/componenti per explorer (clipboard, navigazione, ecc.).
- Attivalo in **`desktop.config.ts` → `modules`** se il desktop deve avere VFS; l’app Explorer è il pacchetto **`@owdproject/app-explorer`** sotto `apps/app-explorer` (i temi la caricano se `module-fs` è attivo).
- **`kit-fs`** sotto `packages/`: componenti UI neutri per l’explorer; non sostituisce `module-fs`.
- **`kit-theme`** sotto `packages/`: composable con nomi neutri (`useDesktopSession`, `useDesktopShellOptions`, …) per non duplicare la logica tra temi.

### `packages/core/` — `@owdproject/core`

**Ruolo**: modulo Nuxt centrale che orchestra tutto.

**All’avvio (ordine logico)**:

1. Inizializza `runtimeConfig.public.desktop`.
2. **Import dinamico** di `desktop.config.ts` dalla root Nuxt (`rootDir + '/desktop.config.ts'`; `owd.config.ts` ancora accettato con warning). Se manca o è invalido, log errore e **interrompe** il setup (il desktop non si configura).
3. Merge della config desktop con `runtimeConfig.public.desktop` (include **`coreVersion`** da `package.json` del core).
4. **`installModule`** in sequenza: **tema** → voci **`modules`** → voci **`apps`** (tutti sono moduli Nuxt).
5. Installa lo stack condiviso: PrimeVue, Tailwind (con content paths aggregati), Pinia, font, icon, VueUse, i18n, ecc.
6. Registra componenti globali core, plugin resize client, auto-import da `composables`, `stores`, `utils`, `core/controllers`.

**Runtime principale** (sotto `runtime/`):

- **`composables/`**: `useApplicationManager`, `useDesktopManager`, `useApplicationEntries`, terminal, …
- **`stores/`**: desktop, finestre, workspace, applicazioni, meta, volume, …
- **`core/controllers/`**: `ApplicationController`, `WindowController` — ciclo di vita app/finestre.
- **`components/Core/`**: shell astratta — es. `CoreDesktop`, `CoreWindow`, rendering applicazioni/finestre.
- **`utils/`**: `defineDesktopApp`, `defineDesktopConfig`, `registerTailwindPath`, normalizzazione config app.

**API pubblica utile** (export da `packages/core/index.ts` e tipi in `types/`):

- **`defineDesktopConfig`**: usato in `desktop.config.ts` (config statica lato build).
- **`defineDesktopApp`**: usato nei **plugin** delle app per registrare un’applicazione nel `ApplicationManager` (id, titolo, finestre, comandi, entries).

**CLI `desktop`** (`bin/desktop.js`, shared `bin/cli.js`): comando principale — `pnpm desktop` apre il pannello di controllo; `desktop dev` avvia il dev server; `desktop add …` installa app/moduli/temi. **`owd`** (`bin/owd.js`) resta come alias deprecato.

### Playground moduli (app e temi)

Pacchetti convertiti al pattern **Nuxt module authoring** (`nuxt-module-build`, `src/module.ts`, `dist/module.mjs`) espongono un **`playground/`** registrato nel workspace root (`pnpm-workspace.yaml`).

**Guida operativa completa (agent/contributor):** [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md) — checklist migrazione da layout legacy, template `package.json` / workflow Pages, plugin `launch-*` in dev, troubleshooting `Could not load @owdproject/…`.

| Pacchetto | Playground | Tema base | GitHub Pages |
|-----------|------------|-----------|--------------|
| `@owdproject/app-about` | `apps/app-about/playground` | `theme-nova` | `owdproject.github.io/app-about/` |
| `@owdproject/app-wasmboy` | `apps/app-wasmboy/playground` | `theme-nova` | `owdproject.github.io/app-wasmboy/` |
| `@owdproject/app-todo` … `app-explorer` | `apps/<app>/playground` | `theme-nova` | repo standalone |
| `@owdproject/app-classic-audioplayer` | `apps/app-classic-audioplayer/playground` | `theme-nova` + **`module-fs`** + mount `test-small.zip` | repo standalone |
| `@owdproject/module-docs` | `packages/module-docs/playground` | `theme-nova` | (monorepo) |
| `@owdproject/module-fs` | `packages/module-fs/playground` | `theme-nova` + audioplayer + FS demo mp3 | `owdproject.github.io/module-fs/` |
| `@owdproject/module-persistence` | `packages/module-persistence/playground` | `theme-nova` + `app-todo` | repo standalone |
| `@owdproject/theme-nova` | `themes/theme-nova/playground` | (tema stesso) + FS + audioplayer | repo standalone |
| `@owdproject/theme-win11` | `themes/theme-win11/playground` | (tema stesso) + FS + audioplayer | repo standalone |
| `@owdproject/theme-gnome` | `themes/theme-gnome/playground` | (tema stesso) + FS + audioplayer | repo standalone |
| `@owdproject/theme-win95` | `themes/theme-win95/playground` | (tema stesso) + `app-about` | `owdproject.github.io/theme-win95/` |
| `@owdproject/core` | `packages/core/playground` | `theme-win95` | (monorepo) |

**`theme-nova`** è il **shell di riferimento** OWD per playground di app/moduli: Start (ricerca + app), tray, dock. Smoke test: Start elenca le app in `desktop.config.ts` del playground.

Comandi nel pacchetto: `dev:prepare` (obbligatorio prima del desktop monorepo), `dev`, `dev:generate` (`NUXT_APP_BASE_URL=/nome-repo/`). Root: `pnpm run prepare:apps` / `prepare:themes`.

Repo standalone: `.github/workflows/pages.yml` → `playground/.output/public`; in repo Settings → Pages → source **GitHub Actions**.

**`theme-win95`**: sorgente in `themes/theme-win95/src/` (`src/module.ts`, `src/runtime/components/Window/*` per `<Window>` delle app). Dopo modifiche al tema: `pnpm run prepare:themes`. Explorer: plugin in `src/runtime/apps/explorer/` (non `installModule('@owdproject/app-explorer')`).

### `apps/*` — applicazioni desktop (moduli Nuxt)

Ogni app è un **pacchetto** (es. `@owdproject/app-about`) con:

- **`src/module.ts`**: `defineNuxtModule` — aggiunge componenti, plugin, path Tailwind (`registerTailwindPath`), opzioni `runtimeConfig` se necessario.
- **`src/runtime/plugin.ts`**: tipicamente su `app:created` chiama **`defineDesktopApp(import.meta → app.config)`** per registrare l’app nel manager.
- **`src/runtime/app.config.ts`**: schema **`ApplicationConfig`** — `id`, `title`, `windows`, `entries`, `commands`, …
- **`playground/`**: mini Nuxt che dipende da `@owdproject/core` per sviluppare il modulo in isolamento.
- Build: **`nuxt-module-build`** → output **`dist/`** esposto da `package.json` (`exports`).

**Flusso dati**: `desktop.config.ts` elenca il pacchetto in **`apps`** → core fa `installModule` → il modulo registra il plugin → il plugin chiama `defineDesktopApp` → le voci compaiono nel sistema (menu, comandi, …).

### `themes/*` — temi (“desktop environment” / OS UI)

Sono **moduli Nuxt** (es. `@owdproject/theme-win95`) che:

- Estendono **`runtimeConfig.public.desktop`** (nome tema, system bar, …) spesso con **deepMerge**.
- Registrano **componenti** (desktop, finestra, barra, sfondo, …), **pagine** (`start`, `boot`, …), **stili** SCSS, **i18n** del tema.
- Registrano path Tailwind per il scanning.

**Nota importante**: un tema può **condizionare** moduli extra (es. Win95: se è presente `@owdproject/module-fs`, installa explorer + player classici). I temi future-oriented (“ogni OS è un tema”) vivono qui: stesso contratto core, asset e layout diversi.

### `template/`

Scheletro per progetti generati (`npm create owd`): `nuxt.config` minimo con `@owdproject/core`, convenzioni path — utile come riferimento per “prodotto minimo” distribuito agli utenti.

### `plugins/`

Previsto dal **workspace pnpm**; può ospitare estensioni Nuxt transversali. Può essere vuoto nel checkout.

---

## Configurazione utente: `desktop.config.ts`

Dal core **3.2** il file canonico è **`desktop.config.ts`** accanto a `nuxt.config.ts`. **`desktop.config.ts`** resta supportato temporaneamente (warning in console); rinominare prima dell’upgrade.

Campi tipici (vedi tipi `DesktopConfig` in core):

| Campo | Significato |
|--------|-------------|
| `theme` | Pacchetto tema (default core: win95) |
| `modules` | Moduli Nuxt aggiuntivi (servizi, persistenza, FS, docs, …) |
| `docs` | Opzioni `@owdproject/module-docs` (`basePath`, `title`, `sources`) |
| `apps` | App desktop da caricare (moduli che espongono plugin + `defineDesktopApp`) |

Il merge finisce in **`runtimeConfig.public.desktop`** e in **`appConfig.desktop`** per override runtime.

---

## Comandi operativi (root `client/`)

| Comando | Scopo |
|---------|--------|
| `pnpm install` | Installa tutte le workspace |
| `pnpm run prepare:modules` | Esegue `dev:prepare` su `apps/*` e `themes/*` dove definito (build/stub moduli) |
| `pnpm desktop` | Pannello di controllo TUI (catalogo, install, dev server dal pannello) |
| `pnpm desktop dev` | Avvia il dev server in foreground (equivalente a `pnpm run dev`) |
| `pnpm run dev` | Avvia il desktop (Nx → `desktop` → `nuxt dev`) |
| `pnpm run generate` | Build statica del desktop |

Dopo modifiche al **sorgente** di un’app modulo, rigenera la `dist` (o stub) con `dev:prepare` / `prepack` nell’app.

---

## Come si crea un nuovo modulo app (riassunto)

Seguire il playbook [`docs/agents/OWD_APP_MODULE_PLAYGROUND.md`](docs/agents/OWD_APP_MODULE_PLAYGROUND.md); in sintesi:

1. Layout `src/module.ts` + `src/runtime/` + `playground/` (`@owdproject/core` + `theme-nova`).
2. Plugin con `name: 'owd-app-*-register'` e `defineDesktopApp` (client-only).
3. `registerTailwindPath` per i componenti Vue.
4. Script `dev:prepare` / `dev:generate`; voce `apps/<pkg>/playground` in `pnpm-workspace.yaml`.
5. Opzionale: integrazione in `desktop/desktop.config.ts`; Pages con `pages.yml` se repo standalone.

---

## Documentazione umana

Il **`README.md`** in root descrive installazione app/temi/moduli via CLI, community e link esterni (`owdproject.org`). Questo **`AGENTS.md`** è orientato a **contesto architetturale** e convenzioni nel repo.

La documentazione pubblica di prodotto sta in **`owd-docs`** (repo sorella / cartella accanto al client): sito **Docus** + Nuxt Content + Nuxt UI. **Lingua: solo inglese** (pagine utente in `content/`). Path utili in dev: **`/getting-started/introduction`**, **`/architecture/overview`**, **`/architecture/docs-module`**, **`/apps/overview`**, **`/themes/overview`**, **`/setup/owd-cli`**, **`/internals/boot-sequence`**, **`/reference/glossary`**. Aggiornare `owd-docs` in parallelo al codice.

---

## Roadmap / area di attenzione (non bloccanti ma da progettare)

Punti che il team ha già in mente per maturità **enterprise** e multi-“OS”:

- **Temi come superficie unica** per differenze UX tra “sistemi operativi” (layout, boot flow, barra, metafora filesystem) mantenendo **API app** stabili.
- **Allineamento versioni** Nuxt/core tra root desktop e singole app (`peerDependencies`, CI).
- **Test e contract** tra core e moduli (prepare/build in CI per ogni app).
- **Theme Win95** oggi può portare dipendenze opzionali condizionate: documentare matrice “tema × modulo FS × app”.

Quando si affrontano questi temi, aggiornare questo file o una sezione `docs/` dedicata per mantenere una sola fonte di verità.
