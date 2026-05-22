import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import blessed from 'neo-blessed'
import {
  findWorkspaceRoot,
  loadSettings,
  saveSettings,
  desktopPaths,
  KINDS,
  shortName,
  isWorkspaceInstallMode,
  isInstallableDesktopModule,
  normalizeInstallMode,
  hasDocsModuleInstalled,
  docsBasePathFromConfig,
} from './lib/workspace.js'
import {
  readDesktopConfig,
  writeDesktopConfig,
  readDesktopDependencies,
  resolveConfigPathForWrite,
} from './lib/config.js'
import { warnLegacyDesktopConfig } from './lib/desktopConfig.js'
import {
  loadCatalog,
  filterCatalog,
  mergeInstalled,
  readThemeMeta,
} from './lib/catalog.js'
import {
  installPackage,
  materializeToWorkspace,
  hasLocalWorkspaceSource,
  runPrepareModules,
  resolveInstallPlan,
  installTag,
} from './lib/install.js'
import {
  getClientStatus,
  startDev,
  stopDev,
  waitForDev,
  devLogPath,
  formatSparkline,
  formatBar,
} from './lib/status.js'
import { resolveDevTarget } from './lib/playgroundContext.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const C = {
  border: 'cyan',
  borderDim: '#3a3a4a',
  focus: 'green',
  accent: '#7ee787',
  warn: 'yellow',
  err: 'red',
  muted: '#6c7086',
  title: 'white',
  userMode: '#7ee787',
  devMode: 'cyan',
}

const SPINNER = ['|', '/', '-', '\\']
const MEM_HISTORY_LEN = 30

/** @param {string} commandName */
export async function runTui(commandName = 'desktop') {
  const workspaceRoot = findWorkspaceRoot()
  if (!workspaceRoot) {
    console.error('Not inside an OWD workspace.')
    process.exit(1)
  }

  const paths = desktopPaths(workspaceRoot)
  const devTarget = resolveDevTarget(process.cwd(), workspaceRoot)
  const playgroundActive = devTarget?.mode === 'playground'
  const playgroundLabel = devTarget?.packageName ?? null
  warnLegacyDesktopConfig(
    paths.configLegacy ? { legacy: true, file: 'owd.config.ts' } : null,
  )
  let settings = loadSettings(workspaceRoot)
  let config = readDesktopConfig(paths.config, workspaceRoot)
  let deps = readDesktopDependencies(paths.packageJson)

  let catalog = []
  let catalogCacheAge = ''
  /** @type {'catalog' | 'theme'} */
  let focusPanel = 'catalog'
  let activeTab = 'module'
  let pendingTheme = config.theme
  /** @type {Map<string, boolean>} */
  const pendingPackages = new Map()
  let statusLine = ''
  let devPhase = 'idle'
  let clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
  /** @type {number[]} */
  const memHistory = []
  let spinnerFrame = 0
  let spinnerTimer = null
  let pulseOn = true
  let modeFlash = 0
  let saveProgress = null
  let settingsOpen = false
  let menuOpen = false

  /** @type {{ id: string, label: string, key: string }[]} */
  const MENU_ITEMS = [
    { id: 'start', label: 'Start dev server', key: 's' },
    { id: 'stop', label: 'Stop dev server', key: 'x' },
    { id: 'reboot', label: 'Reboot dev server', key: 'R' },
    { id: 'save', label: 'Save catalog / theme', key: 'w' },
    { id: 'refresh', label: 'Refresh package list', key: 'r' },
    { id: 'docs', label: 'Open documentation', key: 'i' },
    { id: 'settings', label: 'Settings', key: 'g' },
    { id: 'mode', label: 'Toggle install mode (USER/DEV)', key: 'd' },
    { id: 'build', label: 'Build (pnpm generate)', key: 'b' },
    { id: 'quit', label: 'Quit control panel', key: 'q' },
  ]

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: 'Open Web Desktop',
    dockCorners: false,
  })

  const HEADER_ROWS = playgroundActive ? 4 : 3
  const MAIN_TOP = HEADER_ROWS
  const CLIENT_PANEL_H = 10
  const PANELS_TOP = MAIN_TOP + CLIENT_PANEL_H

  const titleBar = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: HEADER_ROWS,
    tags: true,
    content: '',
    style: { fg: C.title, bg: 'black' },
  })

  const clientBox = blessed.box({
    parent: screen,
    top: MAIN_TOP,
    left: 0,
    width: '58%',
    height: CLIENT_PANEL_H,
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: C.border },
    },
    label: ' Dev server ',
  })

  const metricsBox = blessed.box({
    parent: screen,
    top: MAIN_TOP,
    left: '58%',
    width: '42%',
    height: CLIENT_PANEL_H,
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: C.borderDim },
    },
    label: ' Metrics ',
  })

  const themeBox = blessed.box({
    parent: screen,
    top: PANELS_TOP,
    left: 0,
    width: '32%',
    height: '100%-15',
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: C.borderDim },
    },
    label: ' Theme ',
  })

  const themeList = blessed.list({
    parent: themeBox,
    top: 1,
    left: 1,
    width: '100%-2',
    bottom: 9,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: true,
    alwaysScroll: true,
    style: {
      fg: 'white',
      bg: 'black',
      selected: { bg: '#313244', fg: C.accent, bold: true },
    },
  })

  const themeInfo = blessed.box({
    parent: themeBox,
    bottom: 1,
    left: 1,
    width: '100%-2',
    height: 7,
    tags: true,
    content: '',
    style: { fg: C.muted, bg: 'black' },
  })

  let themeListSyncing = false

  const catalogBox = blessed.box({
    parent: screen,
    top: PANELS_TOP,
    left: '32%',
    width: '68%',
    height: '100%-15',
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: C.focus },
    },
    label: ' Apps & modules ',
  })

  const tabBar = blessed.box({
    parent: catalogBox,
    top: 1,
    left: 1,
    width: '100%-2',
    height: 1,
    tags: true,
    content: '',
  })

  const catalogList = blessed.list({
    parent: catalogBox,
    top: 2,
    left: 1,
    width: '100%-2',
    bottom: 9,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: true,
    alwaysScroll: true,
    style: {
      fg: 'white',
      bg: 'black',
      selected: { bg: '#45475a', fg: 'white', bold: true },
    },
  })

  const detailBox = blessed.box({
    parent: catalogBox,
    bottom: 1,
    left: 1,
    width: '100%-2',
    height: 7,
    tags: true,
    content: '',
    style: { fg: C.muted, bg: 'black' },
  })

  /** Keep list above detail; shrink detail on short terminals. */
  function layoutCatalogPanel() {
    const rows = screen.height ?? 24
    const detailH = rows < 26 ? 4 : rows < 34 ? 5 : 7

    Object.assign(detailBox.position, {
      bottom: 1,
      left: 1,
      width: '100%-2',
      height: detailH,
      top: undefined,
      right: undefined,
    })

    Object.assign(catalogList.position, {
      top: 2,
      left: 1,
      width: '100%-2',
      bottom: detailH + 2,
      height: undefined,
      right: undefined,
    })

    detailBox.emit('resize')
    catalogList.emit('resize')
  }

  layoutCatalogPanel()
  screen.on('resize', () => {
    layoutCatalogPanel()
    screen.render()
  })

  const helpBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 5,
    tags: true,
    border: { type: 'line' },
    label: ' Keys ',
    style: { fg: C.muted, bg: '#11111b', border: { fg: C.borderDim } },
  })

  const settingsOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 54,
    height: 14,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    label: ' Settings ',
    style: { fg: 'white', bg: '#1e1e2e', border: { fg: C.accent } },
    content: '',
  })

  const settingsInfo = blessed.box({
    parent: settingsOverlay,
    top: 1,
    left: 2,
    width: '100%-4',
    height: 3,
    tags: true,
    style: { fg: C.muted, bg: '#1e1e2e' },
  })

  const githubInput = blessed.textbox({
    parent: settingsOverlay,
    top: 5,
    left: 2,
    width: '100%-4',
    height: 3,
    inputOnFocus: true,
    keys: true,
    mouse: true,
    style: { fg: 'white', bg: '#313244', focus: { border: { fg: C.accent } } },
    border: { type: 'line' },
    label: ' GitHub username ',
  })

  const menuOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 52,
    height: MENU_ITEMS.length + 4,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    label: ' Menu ',
    style: { fg: 'white', bg: '#1e1e2e', border: { fg: C.accent } },
  })

  const menuList = blessed.list({
    parent: menuOverlay,
    top: 1,
    left: 1,
    width: '100%-2',
    height: MENU_ITEMS.length + 1,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: true,
    style: {
      fg: 'white',
      bg: '#1e1e2e',
      selected: { bg: '#313244', fg: C.accent, bold: true },
    },
    items: MENU_ITEMS.map(({ label, key }) => `[${key}]  ${label}`),
  })

  function overlayBlocksKeys() {
    return settingsOpen || menuOpen
  }

  function installModeLabel() {
    return isWorkspaceInstallMode(settings) ? 'DEV' : 'USER'
  }

  function installModeColor() {
    return isWorkspaceInstallMode(settings) ? C.devMode : C.userMode
  }

  function renderModeHeader() {
    const isDev = isWorkspaceInstallMode(settings)
    const mode = installModeLabel()
    const color = installModeColor()

    const installLine = isDev
      ? settings.githubUser
        ? `save → git clone {bold}github.com/${settings.githubUser}/…{/}`
        : 'save → git clone {bold}github.com/owdproject/…{/}'
      : 'save → {bold}npm install{/} (registry)'

    const listCount = catalog.length
      ? `{bold}${catalog.length}{/} packages`
      : 'loading…'
    const listCache = catalogCacheAge ? ` · ${catalogCacheAge}` : ''

    const borderFlash = modeFlash > 0 ? 'white' : C.title
    titleBar.style.fg = borderFlash

    const playgroundLine = playgroundActive && playgroundLabel
      ? ` {${C.accent}-fg}Playground:{/} {bold}${playgroundLabel}{/}  {${C.muted}-fg}[s] starts playground · catalog [w] → monorepo desktop{/}`
      : null

    titleBar.setContent(
      [
        ` {bold}{white-fg}Open Web Desktop{/}{/}  {${C.muted}-fg}control panel{/}  {${C.muted}-fg}[m] menu{/}`,
        playgroundLine,
        ` {${C.muted}-fg}Install mode{/}  {bold}{${color}-fg}${mode}{/}{/}  ${installLine}  {${C.muted}-fg}[d] switch{/}`,
        ` {${C.muted}-fg}Package list{/}  ${listCount} from GitHub${listCache}  {${C.muted}-fg}[r] refresh{/}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  function themeEntries() {
    return mergeInstalled(filterCatalog(catalog, 'theme'), config, deps, workspaceRoot)
  }

  function catalogEntries() {
    return mergeInstalled(filterCatalog(catalog, activeTab), config, deps, workspaceRoot)
  }

  function applyFocusStyles() {
    const themeFocused = focusPanel === 'theme'
    themeBox.style.border.fg = themeFocused ? C.focus : C.borderDim
    catalogBox.style.border.fg = themeFocused ? C.borderDim : C.focus
    themeBox.setLabel(themeFocused ? ' {bold}Theme ◀{/} ' : ' Theme ')
    const tab = KINDS[activeTab].label
    catalogBox.setLabel(
      themeFocused ? ' Apps & modules ' : ` {bold}Apps & modules · ${tab} ◀{/} `,
    )
  }

  function panelLabel() {
    if (focusPanel === 'theme') return 'THEME'
    return `APPS & MODULES · ${KINDS[activeTab].label.toUpperCase()}`
  }

  function isDevServerUp() {
    return (
      devPhase === 'running' ||
      devPhase === 'starting' ||
      clientStatus.running ||
      clientStatus.http.up
    )
  }

  function serverKeyHints() {
    return `{${C.muted}-fg}[s]{/} start/stop  {${C.muted}-fg}[m]{/} menu`
  }

  function defaultStatusHint() {
    return 'Press [s] start/stop · [m] menu · [w] save catalog changes'
  }

  function renderHelp(tone = 'info') {
    const statusColor = tone === 'error' ? C.err : tone === 'ok' ? C.accent : C.warn
    const msg = statusLine || defaultStatusHint()
    const progress =
      saveProgress !== null
        ? ` ${formatBar(saveProgress.step, saveProgress.total, 16)} ${saveProgress.label}`
        : ''

    const navLine =
      focusPanel === 'theme'
        ? `{${C.muted}-fg}Navigate{/}  {bold}↑↓{/} {bold}PgUp/PgDn{/} scroll   {bold}Enter{/}/{bold}Space{/} apply   {bold}Tab{/} → apps & modules`
        : `{${C.muted}-fg}Navigate{/}  {bold}↑↓{/} {bold}j/k{/} {bold}PgUp/PgDn{/} scroll   {bold}Space{/} toggle   {bold}Tab{/} → theme   {bold}1{/} apps {bold}2{/} modules {bold}3{/} theme panel`

    helpBar.setContent(
      [
        `{bold}{${statusColor}-fg}${msg}{/}{/}${progress}`,
        `{${C.focus}-fg}▸{/} {bold}${panelLabel()}{/}`,
        navLine,
        `{${C.muted}-fg}Server{/}  {bold}s{/} start/stop  {bold}m{/} menu   {${C.muted}-fg}│{/}  {bold}w{/} save  {bold}r{/} refresh  {bold}i{/} docs  {bold}g{/} settings  {bold}q{/} quit`,
      ].join('\n'),
    )
  }

  function setStatus(msg, tone = 'info') {
    statusLine = msg
    renderHelp(tone)
    screen.render()
  }

  /** Clear stray CLI output and redraw the full TUI (after save, build, etc.). */
  function refreshTerminalUi() {
    try {
      screen.program.clear()
      screen.program.home()
    } catch {
      process.stdout.write('\x1b[2J\x1b[H')
    }
    layoutCatalogPanel()
    if (focusPanel === 'theme') themeList.focus()
    else catalogList.focus()
    renderAll()
  }

  function startSpinner(message) {
    stopSpinner()
    spinnerFrame = 0
    setStatus(message)
    spinnerTimer = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % SPINNER.length
      statusLine = `${SPINNER[spinnerFrame]} ${message}`
      renderHelp('info')
      screen.render()
    }, 120)
  }

  function stopSpinner() {
    if (spinnerTimer) {
      clearInterval(spinnerTimer)
      spinnerTimer = null
    }
  }

  async function flashModeBorder() {
    for (let i = 3; i > 0; i--) {
      modeFlash = i
      renderModeHeader()
      screen.render()
      await new Promise((r) => setTimeout(r, 80))
    }
    modeFlash = 0
    renderModeHeader()
  }

  function toggleInstallMode() {
    const next = isWorkspaceInstallMode(settings) ? 'npm' : 'workspace'
    settings = { ...settings, installMode: normalizeInstallMode(next) }
    saveSettings(workspaceRoot, settings)
    renderModeHeader()
    renderCatalogList()
    renderDetail()
    flashModeBorder()
    setStatus(
      next === 'workspace'
        ? 'Dev mode — saves will git clone into apps/packages/themes'
        : 'User mode — saves will install from npm',
      'ok',
    )
  }

  function renderSettingsPanel() {
    const mode = installModeLabel()
    const color = installModeColor()
    const saveBehavior = isWorkspaceInstallMode(settings)
      ? settings.githubUser
        ? `git clone from github.com/${settings.githubUser}/…`
        : 'git clone from github.com/owdproject/…'
      : 'install from npm registry'

    settingsInfo.setContent(
      [
        `{bold}Install mode{/}  {${color}-fg}${mode}{/}`,
        `{${C.muted}-fg}When you press {bold}w{/} (save): ${saveBehavior}{/}`,
        `{${C.muted}-fg}[d] toggle USER/DEV · GitHub username below = your fork org (optional){/}`,
      ].join('\n'),
    )
  }

  function openSettings() {
    settingsOpen = true
    settingsOverlay.show()
    renderSettingsPanel()
    githubInput.setValue(settings.githubUser ?? '')
    githubInput.focus()
    setStatus('Settings — Enter save · Esc cancel · d toggles USER/DEV')
    screen.render()
  }

  function closeSettings() {
    settingsOpen = false
    settingsOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function openMenu() {
    if (settingsOpen) return
    menuOpen = true
    menuOverlay.show()
    menuList.focus()
    setStatus('Menu — ↑↓ select · Enter run · Esc close')
    screen.render()
  }

  function closeMenu() {
    menuOpen = false
    menuOverlay.hide()
    focusCatalog()
    screen.render()
  }

  async function runMenuAction(id) {
    closeMenu()
    switch (id) {
      case 'start':
        await startDevServer()
        break
      case 'stop':
        await stopDevServer()
        break
      case 'reboot':
        await rebootDevServer()
        break
      case 'save':
        await applyChanges()
        break
      case 'refresh':
        await refreshCatalog()
        break
      case 'docs':
        openDocsInBrowser()
        break
      case 'settings':
        openSettings()
        break
      case 'mode':
        toggleInstallMode()
        break
      case 'build':
        stopSpinner()
        setStatus('Running pnpm run generate…')
        screen.render()
        try {
          execSync('pnpm run generate', { cwd: workspaceRoot, stdio: 'pipe' })
          setStatus('Generate finished', 'ok')
        } catch (err) {
          setStatus(`Generate failed: ${err.message}`, 'error')
        } finally {
          refreshTerminalUi()
        }
        break
      case 'quit':
        process.exit(0)
        break
      default:
        break
    }
  }

  function saveSettingsFromOverlay() {
    const user = githubInput.getValue().trim() || null
    settings = { ...settings, githubUser: user }
    saveSettings(workspaceRoot, settings)
    closeSettings()
    renderModeHeader()
    renderCatalogList()
    renderDetail()
    setStatus(user ? `GitHub user → ${user}` : 'GitHub user cleared', 'ok')
  }

  function formatThemeInfo(meta) {
    const name = meta.name?.replace('@owdproject/', '') ?? '—'
    const authorShort = String(meta.author ?? '—')
      .replace(/\s*·\s*https?:\/\/\S+/g, '')
      .slice(0, 48)
    const gitShort = meta.remote
      ? meta.remote
        .replace(/^git\+/, '')
        .replace(/^https?:\/\/github\.com\//, '')
        .replace(/\.git$/, '')
      : null
    const desc = meta.description
      ? meta.description.length > 72
        ? `${meta.description.slice(0, 72)}…`
        : meta.description
      : null

    return [
      `{${C.borderDim}-fg}{underline} ── selected ── {/}`,
      `{bold}{${C.accent}-fg}${name}{/}{/} {${C.muted}-fg}v${meta.version} · ${meta.license}{/}`,
      desc ? `{${C.muted}-fg}${desc}{/}` : null,
      gitShort
        ? `{${C.muted}-fg}${authorShort}{/} · {${C.accent}-fg}${gitShort}{/}`
        : `{${C.muted}-fg}${authorShort}{/}`,
    ]
      .filter(Boolean)
      .join('\n')
  }

  function renderTabs() {
    const tabs = ['app', 'module'].map((key, i) => {
      const active = activeTab === key
      const label = KINDS[key].label
      return active
        ? `{bold}{${C.accent}-fg} ${i + 1}:${label} {/}{/}`
        : `{${C.muted}-fg} ${i + 1}:${label}{/}`
    })
    tabBar.setContent(`  ${tabs.join('  ')}  {${C.muted}-fg}│  {bold}3{/} or {bold}Tab{/} → theme (left){/}`)
  }

  function renderClient() {
    const http = clientStatus.http
    let stateLabel
    let dotChar
    let dotColor

    if (devPhase === 'starting') {
      stateLabel = 'STARTING…'
      dotChar = SPINNER[spinnerFrame % SPINNER.length]
      dotColor = C.warn
    } else if (clientStatus.running || http.up) {
      stateLabel = 'RUNNING'
      dotChar = pulseOn ? '●' : '◉'
      dotColor = C.accent
      devPhase = 'running'
    } else {
      stateLabel = 'STOPPED'
      dotChar = '○'
      dotColor = C.err
      devPhase = 'stopped'
    }

    const serverRunning = clientStatus.running || http.up
    const pidLine = clientStatus.pid
      ? `PID ${clientStatus.pid}   ${clientStatus.stats.memMb} MiB   ${clientStatus.stats.threads} thr`
      : serverRunning
        ? 'HTTP responding (process not matched)'
        : 'dev server stopped'

    const warnDev =
      isWorkspaceInstallMode(settings) && !settings.githubUser
        ? `\n  {${C.warn}-fg}⚠ DEV mode: open settings [g] to set your GitHub username for fork clones{/}`
        : ''

    const docsInstalled = hasDocsModuleInstalled(config, deps)
    const docsLine = docsInstalled
      ? clientStatus.running || http.up
        ? `  {${C.muted}-fg}Documentation installed{/}  {${C.accent}-fg}[i]{/} open ${docsBasePathFromConfig(config)}`
        : `  {${C.muted}-fg}Documentation installed{/}  {${C.muted}-fg}[s] start dev server, then [i] open docs{/}`
      : ''

    const devTargetLine = playgroundActive && playgroundLabel
      ? `  {${C.accent}-fg}Dev target:{/} {bold}${playgroundLabel}{/} playground`
      : null

    clientBox.setContent(
      [
        `  {${dotColor}-fg}${dotChar}{/}  {bold}${stateLabel}{/}   http://127.0.0.1:${settings.devPort}   HTTP ${http.status || '—'}`,
        `  ${pidLine}`,
        devTargetLine,
        `  ${serverKeyHints()}`,
        `  {${C.muted}-fg}Theme:{/} {bold}${(pendingTheme ?? config.theme ?? '—').replace('@owdproject/', '')}{/}  {${C.muted}-fg}│ [w] save{/}`,
        docsLine,
        warnDev,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  function getDesiredPackages(kind) {
    if (kind === 'theme') {
      return pendingTheme ?? config.theme ? [pendingTheme ?? config.theme] : []
    }
    return filterCatalog(catalog, kind)
      .filter((item) => {
        const pending = pendingPackages.get(item.name)
        if (pending !== undefined) return pending
        return kind === 'app'
          ? (config.apps ?? []).includes(item.name)
          : (config.modules ?? []).includes(item.name)
      })
      .map((item) => item.name)
  }

  function enabledCountForTab(kind) {
    return getDesiredPackages(kind).length
  }

  function renderMetrics() {
    const tabLabel = KINDS[activeTab].label
    const onDesktop = enabledCountForTab(activeTab)

    const spark = memHistory.length ? formatSparkline(memHistory) : '—'
    const memLabel =
      memHistory.length > 0
        ? `${memHistory[memHistory.length - 1]} MiB`
        : clientStatus.stats.memMb
          ? `${clientStatus.stats.memMb} MiB`
          : '—'

    const apps = enabledCountForTab('app')
    const mods = enabledCountForTab('module')
    const themeShort = (pendingTheme ?? config.theme ?? '—').replace('@owdproject/', '')

    const unsaved = pendingPackages.size
    const unsavedLine =
      unsaved > 0
        ? `  {${C.warn}-fg}${unsaved}{/} {${C.muted}-fg}unsaved — [w] save{/}`
        : null

    metricsBox.setContent(
      [
        `  {${C.muted}-fg}Memory{/} {bold}${memLabel}{/}`,
        `  {${C.accent}-fg}${spark}{/}`,
        `  {${C.muted}-fg}${tabLabel}{/}  {bold}${onDesktop}{/} {${C.muted}-fg}on desktop{/}`,
        `  {${C.muted}-fg}Stack{/} ${themeShort} · ${apps} apps · ${mods} modules`,
        unsavedLine,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  function restoreThemeListSelection(entries, themeName) {
    if (!themeName || !entries.length) return
    const idx = entries.findIndex((e) => e.name === themeName)
    if (idx < 0) return
    themeList._listInitialized = false
    themeList.select(idx)
  }

  function renderThemeList() {
    const entries = themeEntries()
    const activeTheme = pendingTheme ?? config.theme
    const items = entries.map((item) => {
      const isActive = activeTheme === item.name
      const bullet = isActive ? `{${C.accent}-fg}●{/}` : '○'
      const tag = item.org === 'workspace' ? `{${C.muted}-fg}[local]{/}` : `{${C.muted}-fg}[${installTag(settings, item)}]{/}`
      return `${bullet} ${item.shortName} ${tag}`
    })

    themeListSyncing = true
    themeList.setItems(items.length ? items : ['{gray-fg}(no themes in catalog){/}'])
    restoreThemeListSelection(entries, activeTheme)
    themeListSyncing = false

    const meta = readThemeMeta(workspaceRoot, activeTheme ?? '')
    themeInfo.setContent(formatThemeInfo(meta))
  }

  function previewThemeAt(index, announce = false) {
    const entries = themeEntries()
    const item = entries[index]
    if (!item) return
    pendingTheme = item.name
    renderThemeList()
    renderClient()
    renderMetrics()
    if (announce) {
      setStatus(`Theme → ${item.shortName} (press [w] to save)`, 'ok')
    }
  }

  function restoreCatalogListSelection(entries, pkgName) {
    if (!pkgName || !entries.length) return
    const idx = entries.findIndex((e) => e.name === pkgName)
    if (idx < 0) return
    catalogList._listInitialized = false
    catalogList.select(idx)
  }

  function listPageStep(list) {
    return Math.max(1, list.height - list.iheight - 1)
  }

  function renderCatalogList() {
    const entries = catalogEntries()
    const prevPkg = entries[catalogList.selected]?.name
    const items = entries.map((item) => {
      const pending = pendingPackages.get(item.name)
      const on = pending !== undefined ? pending : item.installed
      const box = on ? `{${C.accent}-fg}[✓]{/}` : '[ ]'
      const tag = `{${C.muted}-fg}[${installTag(settings, item)}]{/}`
      const desc = (item.description ?? '').slice(0, 36)
      return `${box} {bold}${item.shortName}{/} ${tag}  ${desc}`
    })
    catalogList.setItems(items.length ? items : ['{gray-fg}Loading…{/}'])
    restoreCatalogListSelection(entries, prevPkg)
    renderTabs()
  }

  async function renderDetail() {
    const entries = catalogEntries()
    const idx = catalogList.selected
    const item = entries[idx]
    if (!item) {
      detailBox.setContent(`{${C.muted}-fg}Select a package for install preview{/}`)
      return
    }

    const plan = await resolveInstallPlan(item.name, settings, workspaceRoot)
    if (plan.error) {
      detailBox.setContent(`{${C.err}-fg}${plan.error}{/}`)
      return
    }

    const kind = KINDS[activeTab]
    const target = plan.targetDir ?? `${kind.workspaceDir}/${item.shortName}`
    const npmOnly =
      isWorkspaceInstallMode(settings) && item.installed && !item.localSource
    detailBox.setContent(
      [
        `{bold}{${C.accent}-fg}${item.shortName}{/}{/}`,
        `{${C.muted}-fg}Source:{/} ${plan.label ?? plan.mode}`,
        `{${C.muted}-fg}Target:{/} ${target}/`,
        npmOnly
          ? `{${C.warn}-fg}[npm] in config — save [w] to clone into workspace{/}`
          : null,
        item.description ? `{${C.muted}-fg}${item.description.slice(0, 120)}{/}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  function renderAll() {
    renderModeHeader()
    applyFocusStyles()
    renderClient()
    renderMetrics()
    renderThemeList()
    renderCatalogList()
    renderDetail()
    renderHelp('info')
    screen.render()
  }

  function focusTheme() {
    focusPanel = 'theme'
    themeList.focus()
    applyFocusStyles()
    setStatus('Theme panel — ↑↓ to pick, Enter to apply, Tab for packages')
  }

  function focusCatalog() {
    focusPanel = 'catalog'
    catalogList.focus()
    applyFocusStyles()
    setStatus(`${KINDS[activeTab].label} — Space toggles, [w] saves when done`)
  }

  function selectThemeAt(index) {
    previewThemeAt(index, true)
  }

  function toggleCatalogAt(index) {
    const entries = catalogEntries()
    const item = entries[index]
    if (!item) return
    const pending = pendingPackages.get(item.name)
    const next = pending !== undefined ? !pending : !item.installed
    pendingPackages.set(item.name, next)
    renderCatalogList()
    renderMetrics()
    renderDetail()
    setStatus(`${next ? 'Will install' : 'Will remove'} ${item.shortName}`)
  }

  async function applyChanges() {
    stopSpinner()
    const packagesToInstall = []
    const packagesToMaterialize = []
    const nextApps = getDesiredPackages('app')
    const nextModules = getDesiredPackages('module').filter(isInstallableDesktopModule)
    const nextTheme = pendingTheme ?? config.theme
    const prevApps = new Set(config.apps ?? [])
    const prevModules = new Set(config.modules ?? [])

    for (const pkg of nextApps) {
      if (!prevApps.has(pkg)) packagesToInstall.push(pkg)
    }
    for (const pkg of nextModules) {
      if (!prevModules.has(pkg)) packagesToInstall.push(pkg)
    }
    if (nextTheme && nextTheme !== config.theme) packagesToInstall.push(nextTheme)

    if (isWorkspaceInstallMode(settings)) {
      const enabled = [...nextApps, ...nextModules, nextTheme].filter(Boolean)
      for (const pkg of enabled) {
        if (packagesToInstall.includes(pkg)) continue
        if (!hasLocalWorkspaceSource(workspaceRoot, pkg)) {
          packagesToMaterialize.push(pkg)
        }
      }
    }

    const totalSteps = packagesToInstall.length + packagesToMaterialize.length + 2
    let step = 0
    let didClone = false

    const bump = (label) => {
      step++
      saveProgress = { step, total: totalSteps, label }
      setStatus(label)
      screen.render()
    }

    try {
      bump('Preparing…')

      for (const pkg of packagesToInstall) {
        bump(`Installing ${shortName(pkg)}…`)
        await installPackage(pkg, settings, workspaceRoot, { stdio: 'pipe' })
        if (isWorkspaceInstallMode(settings)) didClone = true
      }

      for (const pkg of packagesToMaterialize) {
        const plan = await resolveInstallPlan(pkg, settings, workspaceRoot)
        if (plan.error) throw new Error(plan.error)
        const from = plan.label ?? plan.source?.label ?? shortName(pkg)
        bump(`Cloning ${shortName(pkg)} from ${from}…`)
        await materializeToWorkspace(pkg, settings, workspaceRoot, { stdio: 'pipe' })
        didClone = true
      }

      if (isWorkspaceInstallMode(settings) && didClone) {
        bump('prepare:modules…')
        runPrepareModules(workspaceRoot, 'pipe')
      }

      bump('Writing config…')
      writeDesktopConfig(resolveConfigPathForWrite(paths), workspaceRoot, {
        theme: nextTheme,
        apps: nextApps,
        modules: nextModules,
      })

      for (const pkg of config.apps ?? []) {
        if (!nextApps.includes(pkg)) {
          execSync(`pnpm remove ${pkg}`, { cwd: paths.desktop, stdio: 'pipe' })
        }
      }
      for (const pkg of config.modules ?? []) {
        if (!nextModules.includes(pkg)) {
          execSync(`pnpm remove ${pkg}`, { cwd: paths.desktop, stdio: 'pipe' })
        }
      }

      pendingPackages.clear()
      paths.config = resolveConfigPathForWrite(paths)
      config = readDesktopConfig(paths.config, workspaceRoot)
      deps = readDesktopDependencies(paths.packageJson)
      pendingTheme = config.theme
      saveProgress = null
      renderAll()
      setStatus('Saved successfully', 'ok')
    } catch (err) {
      saveProgress = null
      setStatus(`Save failed: ${err.message}`, 'error')
    }
  }

  async function startDevServer() {
    if (devPhase === 'starting') {
      setStatus('Dev server is already starting…')
      return
    }
    if (isDevServerUp()) {
      setStatus('Dev server already running — [m] menu to stop or reboot', 'info')
      return
    }

    devPhase = 'starting'
    startSpinner('Starting dev server…')
    renderAll()
    startDev(devTarget)
    clientStatus = await waitForDev(workspaceRoot, settings.devPort)
    stopSpinner()
    devPhase = clientStatus.http.up ? 'running' : 'stopped'
    renderAll()
    const targetHint = playgroundActive && playgroundLabel ? ` (${playgroundLabel})` : ''
    setStatus(
      clientStatus.http.up
        ? `Dev server up on port ${settings.devPort}${targetHint} — [m] menu to stop or reboot`
        : `Dev not responding — check ${devLogPath(workspaceRoot)}`,
      clientStatus.http.up ? 'ok' : 'error',
    )
  }

  async function stopDevServer() {
    if (devPhase === 'starting') {
      setStatus('Dev server is still starting…')
      return
    }
    if (!isDevServerUp()) {
      setStatus('Dev server not running — press [s] to start', 'info')
      return
    }

    stopDev(workspaceRoot, clientStatus.pid)
    devPhase = 'stopped'
    memHistory.length = 0
    clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
    renderAll()
    setStatus('Dev server stopped — press [s] to start', 'ok')
  }

  async function rebootDevServer() {
    if (devPhase === 'starting') {
      setStatus('Cannot reboot while dev server is starting…')
      return
    }
    if (!isDevServerUp()) {
      setStatus('Dev server not running — press [s] to start', 'info')
      return
    }

    devPhase = 'starting'
    startSpinner('Rebooting dev server…')
    renderAll()
    stopDev(workspaceRoot, clientStatus.pid)
    memHistory.length = 0
    await new Promise((r) => setTimeout(r, 800))
    startDev(devTarget)
    clientStatus = await waitForDev(workspaceRoot, settings.devPort)
    stopSpinner()
    devPhase = clientStatus.http.up ? 'running' : 'stopped'
    renderAll()
    const targetHint = playgroundActive && playgroundLabel ? ` (${playgroundLabel})` : ''
    setStatus(
      clientStatus.http.up
        ? `Dev server rebooted on port ${settings.devPort}${targetHint}`
        : `Reboot failed — check ${devLogPath(workspaceRoot)}`,
      clientStatus.http.up ? 'ok' : 'error',
    )
  }

  async function refreshCatalog() {
    startSpinner('Fetching GitHub catalog…')
    try {
      const result = await loadCatalog(workspaceRoot, settings)
      catalog = result.entries
      catalogCacheAge = result.cacheAge ?? ''
      config = readDesktopConfig(paths.config, workspaceRoot)
      deps = readDesktopDependencies(paths.packageJson)
      pendingTheme = pendingTheme ?? config.theme
      stopSpinner()
      renderAll()
      setStatus(`Package list: ${catalog.length} from GitHub`, 'ok')
    } catch (err) {
      stopSpinner()
      setStatus(`Package list error: ${err.message}`, 'error')
    }
  }

  screen.key(['escape'], () => {
    if (settingsOpen) {
      closeSettings()
      return
    }
    if (menuOpen) {
      closeMenu()
    }
  })

  screen.key(['q', 'C-c'], () => {
    if (settingsOpen) {
      closeSettings()
      return
    }
    if (menuOpen) {
      closeMenu()
      return
    }
    process.exit(0)
  })

  screen.key(['tab'], () => {
    if (overlayBlocksKeys()) return
    if (focusPanel === 'catalog') focusTheme()
    else focusCatalog()
  })
  screen.key(['S-tab'], () => {
    if (!overlayBlocksKeys()) focusCatalog()
  })

  screen.key(['m', 'M'], () => {
    if (settingsOpen) return
    if (menuOpen) closeMenu()
    else openMenu()
  })

  screen.key(['d', 'D'], () => {
    if (!overlayBlocksKeys()) toggleInstallMode()
  })
  screen.key(['s', 'S'], () => {
    if (!overlayBlocksKeys()) {
      if (isDevServerUp()) stopDevServer()
      else startDevServer()
    }
  })
  screen.key(['x', 'X'], () => {
    if (!overlayBlocksKeys()) stopDevServer()
  })
  screen.key(['R'], () => {
    if (!overlayBlocksKeys()) rebootDevServer()
  })
  screen.key(['g'], () => {
    if (!overlayBlocksKeys()) openSettings()
  })

  function openDocsInBrowser() {
    if (!hasDocsModuleInstalled(config, deps)) {
      setStatus('Install @owdproject/module-docs first', 'error')
      return
    }
    const http = clientStatus.http
    if (!clientStatus.running && !http.up) {
      setStatus('Start dev server [s] before opening docs', 'error')
      return
    }
    const base = docsBasePathFromConfig(config)
    const url = `http://127.0.0.1:${settings.devPort}${base}`
    const platform = process.platform
    try {
      if (platform === 'darwin') {
        execSync('open', [url])
      } else if (platform === 'win32') {
        execSync('cmd', ['/c', 'start', '', url])
      } else {
        execSync('xdg-open', [url])
      }
      setStatus(`Opened ${url}`, 'ok')
    } catch (err) {
      setStatus(`Could not open browser: ${err.message}`, 'error')
    }
  }

  screen.key(['i', 'I'], () => {
    if (!overlayBlocksKeys()) openDocsInBrowser()
  })
  screen.key(['b'], () => {
    if (!overlayBlocksKeys()) {
      stopSpinner()
      setStatus('Running pnpm run generate…')
      screen.render()
      try {
        execSync('pnpm run generate', { cwd: workspaceRoot, stdio: 'pipe' })
        setStatus('Generate finished', 'ok')
      } catch (err) {
        setStatus(`Generate failed: ${err.message}`, 'error')
      } finally {
        refreshTerminalUi()
      }
    }
  })
  screen.key(['w', 'W'], () => {
    if (!overlayBlocksKeys()) applyChanges()
  })
  screen.key(['r'], () => {
    if (!overlayBlocksKeys()) refreshCatalog()
  })

  screen.key(['1'], () => {
    if (overlayBlocksKeys()) return
    activeTab = 'app'
    focusCatalog()
    renderAll()
  })
  screen.key(['2'], () => {
    if (overlayBlocksKeys()) return
    activeTab = 'module'
    focusCatalog()
    renderAll()
  })
  screen.key(['3', 't'], () => {
    if (overlayBlocksKeys()) return
    focusTheme()
    renderAll()
  })

  githubInput.key(['enter'], () => saveSettingsFromOverlay())
  githubInput.key(['escape'], () => closeSettings())

  menuList.on('select', (_item, index) => {
    const entry = MENU_ITEMS[index]
    if (entry) runMenuAction(entry.id)
  })
  menuList.key(['escape'], () => closeMenu())

  themeList.on('select item', (_item, index) => {
    if (themeListSyncing) return
    previewThemeAt(index)
  })
  themeList.on('select', (_item, index) => {
    if (themeListSyncing) return
    selectThemeAt(index)
  })
  themeList.key(['space'], function () {
    selectThemeAt(this.selected)
  })
  themeList.key(['pageup'], function () {
    this.up(listPageStep(this))
    this.screen.render()
  })
  themeList.key(['pagedown'], function () {
    this.down(listPageStep(this))
    this.screen.render()
  })

  catalogList.on('select item', () => {
    renderDetail()
  })
  catalogList.on('select', (_item, index) => toggleCatalogAt(index))
  catalogList.key(['space'], function () {
    toggleCatalogAt(this.selected)
  })
  catalogList.key(['pageup'], function () {
    this.up(listPageStep(this))
    renderDetail()
    this.screen.render()
  })
  catalogList.key(['pagedown'], function () {
    this.down(listPageStep(this))
    renderDetail()
    this.screen.render()
  })

  await refreshCatalog()
  clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
  devPhase = clientStatus.running ? 'running' : 'stopped'
  focusCatalog()
  renderAll()

  const serverHint = ' Press [s] start/stop · [m] menu.'

  if (!isWorkspaceInstallMode(settings)) {
    setStatus(
      `USER mode: save installs from npm. Press [d] to switch to DEV (git clone).${serverHint}`,
      'info',
    )
  } else if (!settings.githubUser) {
    setStatus(
      `DEV mode: save clones from github.com/owdproject. Press [g] for your GitHub username.${serverHint}`,
      'ok',
    )
  } else if (serverHint) {
    setStatus(serverHint.trim(), 'info')
  }

  setInterval(async () => {
    pulseOn = !pulseOn
    if (devPhase !== 'starting' && !settingsOpen) {
      clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
      if (clientStatus.stats.memMb > 0) {
        memHistory.push(clientStatus.stats.memMb)
        if (memHistory.length > MEM_HISTORY_LEN) memHistory.shift()
      }
      if (clientStatus.http.up) devPhase = 'running'
      else if (devPhase === 'running') devPhase = 'stopped'
    }
    renderClient()
    renderMetrics()
    screen.render()
  }, 2000)
}
