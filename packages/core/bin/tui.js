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
  normalizeCatalogSort,
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
  formatCatalogAge,
  CATALOG_SORT_MODES,
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

const BG = '#000000'

/** Flat fill for header rows and inner boxes (replaces old Catppuccin #1e1e2e / #11111b). */
function flatStyle(fg = 'white') {
  return { fg, bg: BG }
}

/** Panel fill (black) + colored border lines + label. */
function panelStyle(borderFg, fg = 'white') {
  return {
    fg,
    bg: BG,
    border: { fg: borderFg },
    label: { fg, bg: BG },
  }
}

const LIST_SCROLLBAR = {
  ch: '│',
  track: { ch: ' ', bg: BG },
  style: { bg: BG, fg: C.borderDim },
}

const LIST_STYLE = {
  fg: 'white',
  bg: BG,
  item: { fg: 'white', bg: BG },
  track: { bg: BG },
  scrollbar: { bg: BG, fg: C.borderDim },
  selected: { bg: BG, fg: C.accent, bold: true },
}

/** Unicode superscript hints (HTML &lt;sup&gt; equivalent in TUI). */
const KEY_SUP = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  a: 'ᵃ',
  b: 'ᵇ',
  d: 'ᵈ',
  g: 'ᵍ',
  i: 'ⁱ',
  m: 'ᵐ',
  o: 'ᵒ',
  q: 'ᵠ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  w: 'ʷ',
  x: 'ˣ',
}

/** @param {string} key */
function keySup(key) {
  const k = String(key).toLowerCase()
  return KEY_SUP[k] ?? KEY_SUP[key] ?? key
}

/** @param {string} key */
function keyHint(key) {
  return `{${C.accent}-fg}${keySup(key)}{/}`
}

/** First letter primary, optional superscript key. */
function cardTitle(title, key = null) {
  const first = title.charAt(0)
  const rest = title.slice(1)
  const hint = key != null ? keyHint(key) : ''
  return `{${C.accent}-fg}${first}{/}{white-fg}${rest}{/}${hint}`
}

/** @param {string} title @param {string | null} [key] */
function cardLabel(title, key = null) {
  return ` ${cardTitle(title, key)} `
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
  let activeTab = 'module'
  let themePickerOpen = false
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
  let modeHelpOpen = false
  /** @type {ReturnType<typeof setTimeout> | null} */
  let configRestartHintTimer = null
  let configRestartHintUntil = 0

  /** @type {{ id: string, label: string, key: string }[]} */
  const MENU_ITEMS = [
    { id: 'start', label: 'Start dev server', key: 's' },
    { id: 'stop', label: 'Stop dev server', key: 'x' },
    { id: 'reboot', label: 'Reboot dev server', key: 'R' },
    { id: 'save', label: 'Save catalog / theme', key: 'w' },
    { id: 'refresh', label: 'Refresh package list', key: 'r' },
    { id: 'docs', label: 'Open documentation', key: 'i' },
    { id: 'settings', label: 'Settings', key: 'g' },
    { id: 'mode', label: 'Install mode (USER/DEV)…', key: 'd' },
    { id: 'build', label: 'Build (pnpm generate)', key: 'b' },
    { id: 'quit', label: 'Quit control panel', key: 'q' },
  ]

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: 'Desktop',
    dockCorners: false,
    style: flatStyle(),
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
    style: flatStyle(C.title),
  })

  const headerLines = blessed.box({
    parent: titleBar,
    top: 0,
    left: 0,
    width: '100%',
    height: playgroundActive && playgroundLabel ? 2 : 1,
    tags: true,
    content: '',
    style: flatStyle(C.title),
  })

  const installModeBar = blessed.box({
    parent: titleBar,
    top: playgroundActive && playgroundLabel ? 2 : 1,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    mouse: true,
    content: '',
    style: flatStyle(C.title),
  })

  const packageListBar = blessed.box({
    parent: titleBar,
    top: HEADER_ROWS - 1,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    content: '',
    style: flatStyle(C.title),
  })

  const clientBox = blessed.box({
    parent: screen,
    top: MAIN_TOP,
    left: 0,
    width: '58%',
    height: CLIENT_PANEL_H,
    tags: true,
    border: { type: 'line' },
    style: panelStyle(C.border),
    label: cardLabel('Dev server', 's'),
  })

  const metricsBox = blessed.box({
    parent: screen,
    top: MAIN_TOP,
    left: '58%',
    width: '42%',
    height: CLIENT_PANEL_H,
    tags: true,
    border: { type: 'line' },
    style: panelStyle(C.borderDim),
    label: cardLabel('Metrics'),
  })

  const catalogBox = blessed.box({
    parent: screen,
    top: PANELS_TOP,
    left: 0,
    width: '100%',
    height: '100%-13',
    tags: true,
    border: { type: 'line' },
    style: panelStyle(C.focus),
    label: cardLabel('Catalog'),
  })

  const tabBar = blessed.box({
    parent: catalogBox,
    top: 0,
    left: 1,
    width: '100%-2',
    height: 1,
    tags: true,
    content: '',
    style: flatStyle(),
  })

  const catalogList = blessed.list({
    parent: catalogBox,
    top: 1,
    left: 1,
    width: '100%-2',
    bottom: 9,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: LIST_SCROLLBAR,
    alwaysScroll: true,
    style: LIST_STYLE,
  })

  const detailBox = blessed.box({
    parent: catalogBox,
    bottom: 1,
    left: 1,
    width: '100%-2',
    height: 7,
    tags: true,
    content: '',
    style: flatStyle(C.muted),
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
      top: 1,
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
    height: 3,
    tags: true,
    border: { type: 'line' },
    label: cardLabel('Keys'),
    style: panelStyle(C.borderDim, C.muted),
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
    label: cardLabel('Settings', 'g'),
    style: panelStyle(C.accent),
    content: '',
  })

  const settingsInfo = blessed.box({
    parent: settingsOverlay,
    top: 1,
    left: 2,
    width: '100%-4',
    height: 3,
    tags: true,
    style: flatStyle(C.muted),
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
    style: {
      fg: 'white',
      bg: BG,
      focus: { border: { fg: C.accent } },
      border: { fg: C.borderDim },
      label: { fg: 'white', bg: BG },
    },
    border: { type: 'line' },
    label: cardLabel('GitHub username'),
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
    label: cardLabel('Menu', 'm'),
    style: panelStyle(C.accent),
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
    scrollbar: LIST_SCROLLBAR,
    style: LIST_STYLE,
    items: MENU_ITEMS.map(({ label, key }) => `${keyHint(key)}  ${label}`),
  })

  const MODE_OPTIONS = [
    { id: 'npm', label: 'USER', desc: 'npm install from registry' },
    { id: 'workspace', label: 'DEV', desc: 'git clone into apps/packages/themes' },
  ]

  const modeHelpOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 58,
    height: 13,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    label: cardLabel('Install mode', 'd'),
    style: panelStyle(C.accent),
  })

  const modeHelpHint = blessed.box({
    parent: modeHelpOverlay,
    top: 0,
    left: 1,
    width: '100%-2',
    height: 3,
    tags: true,
    style: flatStyle(C.muted),
  })

  const modeHelpList = blessed.list({
    parent: modeHelpOverlay,
    top: 3,
    left: 1,
    width: '100%-2',
    height: 4,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    style: LIST_STYLE,
    items: [],
  })

  const modeHelpFooter = blessed.box({
    parent: modeHelpOverlay,
    bottom: 1,
    left: 1,
    width: '100%-2',
    height: 2,
    tags: true,
    style: flatStyle(C.muted),
  })

  const themePickerOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 44,
    height: 14,
    hidden: true,
    tags: true,
    keys: true,
    border: { type: 'line' },
    label: cardLabel('Theme', 't'),
    style: panelStyle(C.accent),
  })

  const themePickerList = blessed.list({
    parent: themePickerOverlay,
    top: 1,
    left: 1,
    width: '100%-2',
    height: 10,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: LIST_SCROLLBAR,
    style: LIST_STYLE,
  })

  let themeListSyncing = false

  function overlayBlocksKeys() {
    return settingsOpen || menuOpen || modeHelpOpen || themePickerOpen
  }

  function catalogFilterOptions() {
    return {
      sortMode: settings.catalogSort,
      config: {
        apps: config.apps,
        modules: config.modules,
        theme: pendingTheme ?? config.theme,
      },
    }
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
    headerLines.style.fg = borderFlash
    installModeBar.style.fg = borderFlash
    packageListBar.style.fg = borderFlash

    const playgroundLine = playgroundActive && playgroundLabel
      ? ` {${C.accent}-fg}Playground:{/} {bold}${playgroundLabel}{/}  ${keyHint('s')} starts playground · catalog ${keyHint('w')} → monorepo desktop`
      : null

    headerLines.setContent(
      [
        ` {bold}{white-fg}Desktop{/}{/}  {${C.muted}-fg}control panel{/}  ${keyHint('m')} menu`,
        playgroundLine,
      ]
        .filter(Boolean)
        .join('\n'),
    )

    installModeBar.setContent(
      ` {${C.muted}-fg}Install mode{/}  {bold}{${color}-fg}${mode}{/}{/}  ${installLine}  ${keyHint('d')} panel`,
    )

    packageListBar.setContent(
      ` {${C.muted}-fg}Package list{/}  ${listCount} from GitHub${listCache}  ${keyHint('r')} refresh`,
    )
  }

  function themeEntries() {
    return mergeInstalled(
      filterCatalog(catalog, 'theme', catalogFilterOptions()),
      config,
      deps,
      workspaceRoot,
    )
  }

  function catalogEntries() {
    return mergeInstalled(
      filterCatalog(catalog, activeTab, catalogFilterOptions()),
      config,
      deps,
      workspaceRoot,
    )
  }

  function applyFocusStyles() {
    const tab = KINDS[activeTab].label
    catalogBox.setLabel(` ${cardTitle('Catalog')} · ${tab} ◀ `)
    if (catalogBox._label?.style) {
      catalogBox._label.style.bg = BG
    }
  }

  function sortModeLabel() {
    const mode = normalizeCatalogSort(settings.catalogSort)
    return mode.charAt(0).toUpperCase() + mode.slice(1)
  }

  function cycleCatalogSort() {
    const idx = CATALOG_SORT_MODES.indexOf(normalizeCatalogSort(settings.catalogSort))
    const next = CATALOG_SORT_MODES[(idx + 1) % CATALOG_SORT_MODES.length]
    settings = { ...settings, catalogSort: next }
    saveSettings(workspaceRoot, settings)
    renderCatalogList()
    renderDetail()
    setStatus(`Catalog sort → ${sortModeLabel()} (${keyHint('o')} cycle)`, 'ok')
    screen.render()
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
    return `${keyHint('s')} start/stop  ${keyHint('m')} menu`
  }

  function defaultStatusHint() {
    return 'Ready'
  }

  function renderHelp(tone = 'info') {
    const statusColor = tone === 'error' ? C.err : tone === 'ok' ? C.accent : C.warn
    const msg = statusLine || defaultStatusHint()
    const progress =
      saveProgress !== null
        ? ` ${formatBar(saveProgress.step, saveProgress.total, 16)} ${saveProgress.label}`
        : ''

    helpBar.setContent(
      [
        `{bold}{${statusColor}-fg}${msg}{/}{/}${progress}`,
        `{${C.muted}-fg}↑↓ Space{/} toggle  ${keyHint('1')}${keyHint('2')} tabs  ${keyHint('w')} save  ${keyHint('s')} server  ${keyHint('t')} theme  ${keyHint('o')} sort  ${keyHint('m')} menu  ${keyHint('q')} quit`,
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
    catalogList.focus()
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
    if (modeHelpOpen) renderModeHelpPanel()
    flashModeBorder()
    setStatus(
      next === 'workspace'
        ? 'Dev mode — saves will git clone into apps/packages/themes'
        : 'User mode — saves will install from npm',
      'ok',
    )
  }

  function formatModeHelpItems() {
    const isDev = isWorkspaceInstallMode(settings)
    return MODE_OPTIONS.map((opt) => {
      const active = (opt.id === 'workspace') === isDev
      const bullet = active ? `{${C.accent}-fg}●{/}` : '○'
      const color = opt.id === 'workspace' ? C.devMode : C.userMode
      return `${bullet} {bold}{${color}-fg}${opt.label}{/}{/}  {${C.muted}-fg}${opt.desc}{/}`
    })
  }

  function renderModeHelpPanel() {
    const mode = installModeLabel()
    const color = installModeColor()
    const isDev = isWorkspaceInstallMode(settings)

    modeHelpHint.setContent(
      [
        `{bold}Current:{/} {bold}{${color}-fg}${mode}{/}{/}`,
        `{${C.muted}-fg}Choose how {bold}w{/} (save) installs packages.{/}`,
      ].join('\n'),
    )
    modeHelpList.setItems(formatModeHelpItems())
    modeHelpList.select(isDev ? 1 : 0)
    modeHelpFooter.setContent(
      `{${C.muted}-fg}↑↓ select · {bold}Enter{/} apply · {bold}u{/} USER · {bold}D{/} DEV · Esc close{/}`,
    )
  }

  function applyModeFromHelp(index) {
    const wantDev = index === 1
    const isDev = isWorkspaceInstallMode(settings)
    if (wantDev !== isDev) {
      toggleInstallMode()
      return
    }
    renderModeHelpPanel()
    setStatus(`Install mode already ${installModeLabel()}`, 'info')
    screen.render()
  }

  function openInstallModeHelp() {
    if (settingsOpen || menuOpen || themePickerOpen) return
    modeHelpOpen = true
    modeHelpOverlay.setFront()
    modeHelpOverlay.show()
    renderModeHelpPanel()
    modeHelpList.focus()
    setStatus(
      `Install mode: ${installModeLabel()} — ↑↓ select · Enter apply · u/D quick switch · Esc close`,
    )
    screen.render()
  }

  function closeInstallModeHelp() {
    modeHelpOpen = false
    modeHelpOverlay.hide()
    focusCatalog()
    screen.render()
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
        `${keyHint('d')} install mode info · GitHub username below = your fork org (optional)`,
      ].join('\n'),
    )
  }

  function openSettings() {
    settingsOpen = true
    settingsOverlay.show()
    renderSettingsPanel()
    githubInput.setValue(settings.githubUser ?? '')
    githubInput.focus()
    setStatus(`Settings — Enter save · Esc cancel · ${keyHint('d')} install mode info`)
    screen.render()
  }

  function closeSettings() {
    settingsOpen = false
    settingsOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function openMenu() {
    if (settingsOpen || modeHelpOpen || themePickerOpen) return
 
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
        openInstallModeHelp()
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

  function renderTabs() {
    const tab = (id, name, numKey) => {
      const active = activeTab === id
      if (active) {
        return `{bold}${cardTitle(name, numKey)}{/}`
      }
      return `{${C.muted}-fg}${name}{/}${keyHint(numKey)}`
    }
    tabBar.setContent(
      ` ${tab('app', 'Apps', '1')}  ${tab('module', 'Modules', '2')}  {right}{${C.muted}-fg}sort{/} {bold}${sortModeLabel().toLowerCase()}{/} ${keyHint('o')}`,
    )
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
        ? `\n  {${C.warn}-fg}⚠ DEV mode: open settings ${keyHint('g')} to set your GitHub username for fork clones{/}`
        : ''

    const docsInstalled = hasDocsModuleInstalled(config, deps)
    const docsLine = docsInstalled
      ? clientStatus.running || http.up
        ? `  {${C.muted}-fg}Documentation installed{/}  ${keyHint('i')} open ${docsBasePathFromConfig(config)}`
        : `  {${C.muted}-fg}Documentation installed{/}  ${keyHint('s')} start dev server, then ${keyHint('i')} open docs`
      : ''

    const devTargetLine = playgroundActive && playgroundLabel
      ? `  {${C.accent}-fg}Dev target:{/} {bold}${playgroundLabel}{/} playground`
      : null

    const configRestartLine =
      configRestartHintUntil > Date.now() && serverRunning
        ? `  {${C.devMode}-fg}ℹ{/} {${C.muted}-fg}desktop.config.ts updated — Nuxt is restarting (see dev server log){/}`
        : null

    clientBox.setContent(
      [
        `  {${dotColor}-fg}${dotChar}{/}  {bold}${stateLabel}{/}   http://127.0.0.1:${settings.devPort}   HTTP ${http.status || '—'}`,
        `  ${pidLine}`,
        devTargetLine,
        `  ${serverKeyHints()}`,
        configRestartLine,
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
    return filterCatalog(catalog, kind, catalogFilterOptions())
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
    const themePending =
      pendingTheme && pendingTheme !== config.theme ? ` {${C.warn}-fg}*{/}` : ''

    const unsaved = pendingPackages.size
    const unsavedLine =
      unsaved > 0
        ? `  {${C.warn}-fg}${unsaved}{/} {${C.muted}-fg}unsaved — ${keyHint('w')} save`
        : null

    metricsBox.setContent(
      [
        `  {${C.muted}-fg}Memory{/} {bold}${memLabel}{/}`,
        `  {${C.accent}-fg}${spark}{/}`,
        `  {${C.muted}-fg}${tabLabel}{/}  {bold}${onDesktop}{/} {${C.muted}-fg}on desktop{/}`,
        `  ${cardTitle('Theme', 't')} {bold}${themeShort}{/}${themePending}  ·  ${apps} apps · ${mods} modules`,
        unsavedLine,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  function restoreThemePickerSelection(entries, themeName) {
    if (!themeName || !entries.length) return
    const idx = entries.findIndex((e) => e.name === themeName)
    if (idx < 0) return
    themePickerList._listInitialized = false
    themePickerList.select(idx)
  }

  function renderThemePickerList() {
    const entries = themeEntries()
    const activeTheme = pendingTheme ?? config.theme
    const items = entries.map((item) => {
      const isActive = activeTheme === item.name
      const bullet = isActive ? `{${C.accent}-fg}●{/}` : '○'
      const tag = item.org === 'workspace' ? `{${C.muted}-fg}[local]{/}` : `{${C.muted}-fg}[${installTag(settings, item)}]{/}`
      return `${bullet} ${item.shortName} ${tag}`
    })

    themeListSyncing = true
    themePickerList.setItems(items.length ? items : ['{gray-fg}(no themes in catalog){/}'])
    restoreThemePickerSelection(entries, activeTheme)
    themeListSyncing = false
  }

  function openThemePicker() {
    if (settingsOpen || menuOpen || modeHelpOpen) return
    themePickerOpen = true
    themePickerOverlay.show()
    renderThemePickerList()
    themePickerList.focus()
    setStatus(`Theme — Enter select · Esc close · ${keyHint('w')} save after change`)
    screen.render()
  }

  function closeThemePicker() {
    themePickerOpen = false
    themePickerOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function selectThemeAt(index) {
    const entries = themeEntries()
    const item = entries[index]
    if (!item) return
    pendingTheme = item.name
    closeThemePicker()
    renderMetrics()
    renderTabs()
    setStatus(`Theme → ${item.shortName} (press ${keyHint('w')} to save)`, 'ok')
    screen.render()
  }

  function formatCatalogRow(item) {
    const pending = pendingPackages.get(item.name)
    const on = pending !== undefined ? pending : item.installed
    const box = on ? `{${C.accent}-fg}[✓]{/}` : '[ ]'
    const tag = `{${C.muted}-fg}[${installTag(settings, item)}]{/}`
    const newBadge =
      activeTab === 'module' && (item.isNew || item.isRecent)
        ? ` {${C.warn}-fg}[new]{/}`
        : ''
    const stars =
      item.stars > 0 ? ` {${C.muted}-fg}★${item.stars}{/}` : ''
    const age = formatCatalogAge(item.updatedAt ?? item.pushedAt)
    const ageStr = age ? ` {${C.muted}-fg}${age}{/}` : ''
    return `${box} {bold}${item.shortName}{/}${newBadge} ${tag}${stars}${ageStr}`
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
    const items = entries.map((item) => formatCatalogRow(item))
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
        `{${C.muted}-fg}Target:{/} ${target}/`,
        npmOnly
          ? `{${C.warn}-fg}[npm] in config — save ${keyHint('w')} to clone into workspace`
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
    renderCatalogList()
    renderDetail()
    renderHelp('info')
    screen.render()
  }

  function focusCatalog() {
    catalogList.focus()
    applyFocusStyles()
    setStatus(`${KINDS[activeTab].label} — Space toggle · w save`)
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
    setStatus(
      `${next ? 'Will install' : 'Will remove'} ${item.shortName} — press ${keyHint('w')} to save`,
    )
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

      if (configRestartHintTimer) {
        clearTimeout(configRestartHintTimer)
        configRestartHintTimer = null
      }
      if (isDevServerUp()) {
        configRestartHintUntil = Date.now() + 5000
        configRestartHintTimer = setTimeout(() => {
          configRestartHintUntil = 0
          configRestartHintTimer = null
          renderClient()
          screen.render()
        }, 5000)
      }

      renderAll()
      setStatus(
        isDevServerUp()
          ? 'Saved — desktop.config.ts updated; Nuxt restarts automatically (see dev server log)'
          : `Saved successfully — start dev server ${keyHint('s')} to apply`,
        'ok',
      )
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
      setStatus(`Dev server already running — ${keyHint('m')} menu to stop or reboot`, 'info')
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
        ? `Dev server up on port ${settings.devPort}${targetHint} — ${keyHint('m')} menu to stop or reboot`
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
      setStatus(`Dev server not running — press ${keyHint('s')} to start`, 'info')
      return
    }

    stopDev(workspaceRoot, clientStatus.pid)
    devPhase = 'stopped'
    memHistory.length = 0
    clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
    renderAll()
    setStatus(`Dev server stopped — press ${keyHint('s')} to start`, 'ok')
  }

  async function rebootDevServer() {
    if (devPhase === 'starting') {
      setStatus('Cannot reboot while dev server is starting…')
      return
    }
    if (!isDevServerUp()) {
      setStatus(`Dev server not running — press ${keyHint('s')} to start`, 'info')
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
      const result = await loadCatalog(workspaceRoot, settings, { force: true })
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
    if (modeHelpOpen) {
      closeInstallModeHelp()
      return
    }
    if (themePickerOpen) {
      closeThemePicker()
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
    if (modeHelpOpen) {
      closeInstallModeHelp()
      return
    }
    if (themePickerOpen) {
      closeThemePicker()
      return
    }
    if (menuOpen) {
      closeMenu()
      return
    }
    process.exit(0)
  })

  screen.key(['m', 'M'], () => {
    if (settingsOpen || modeHelpOpen || themePickerOpen) return
    if (menuOpen) closeMenu()
    else openMenu()
  })

  screen.key(['d', 'D'], () => {
    if (settingsOpen || menuOpen || themePickerOpen) return
    if (modeHelpOpen) closeInstallModeHelp()
    else openInstallModeHelp()
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
      setStatus(`Start dev server ${keyHint('s')} before opening docs`, 'error')
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

  screen.key(['o', 'O'], () => {
    if (!overlayBlocksKeys()) cycleCatalogSort()
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
  screen.key(['t', 'T'], () => {
    if (!overlayBlocksKeys()) openThemePicker()
  })

  githubInput.key(['enter'], () => saveSettingsFromOverlay())
  githubInput.key(['escape'], () => closeSettings())

  installModeBar.on('click', () => {
    if (settingsOpen || menuOpen || themePickerOpen) return
    if (modeHelpOpen) closeInstallModeHelp()
    else openInstallModeHelp()
  })

  modeHelpList.on('select', (_item, index) => applyModeFromHelp(index))
  modeHelpList.key(['escape'], () => closeInstallModeHelp())
  modeHelpList.key(['u', 'U'], () => applyModeFromHelp(0))
  modeHelpList.key(['D'], () => applyModeFromHelp(1))
  modeHelpOverlay.key(['escape'], () => closeInstallModeHelp())

  screen.key(['u', 'U'], () => {
    if (modeHelpOpen) applyModeFromHelp(0)
  })
  screen.key(['D'], () => {
    if (modeHelpOpen) applyModeFromHelp(1)
  })

  menuList.on('select', (_item, index) => {
    const entry = MENU_ITEMS[index]
    if (entry) runMenuAction(entry.id)
  })
  menuList.key(['escape'], () => closeMenu())

  themePickerList.on('select', (_item, index) => {
    if (themeListSyncing) return
    selectThemeAt(index)
  })
  themePickerList.key(['enter'], function () {
    if (themeListSyncing) return
    selectThemeAt(this.selected)
  })
  themePickerList.key(['escape'], () => closeThemePicker())
  themePickerOverlay.key(['escape'], () => closeThemePicker())

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

  const serverHint = ` Press ${keyHint('s')} start/stop · ${keyHint('m')} menu.`

  if (!isWorkspaceInstallMode(settings)) {
    setStatus(
      `USER mode: save installs from npm. Press ${keyHint('d')} for install mode info.${serverHint}`,
      'info',
    )
  } else if (!settings.githubUser) {
    setStatus(
      `DEV mode: save clones from github.com/owdproject. Press ${keyHint('d')} for info · ${keyHint('g')} for GitHub username.${serverHint}`,
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
