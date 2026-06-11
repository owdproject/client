import { execSync } from 'node:child_process'
import { watch, existsSync, statSync, openSync, readSync, closeSync, writeFileSync, readFileSync } from 'node:fs'
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
  isInstallableDesktopModule,
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
  effectiveInstalledSets,
  CATALOG_SORT_MODES,
  CATALOG_SORT_LABELS,
  CATALOG_SORT_DESCRIPTIONS,
} from './lib/catalog.js'
import {
  installPackage,
  materializeToWorkspace,
  hasLocalWorkspaceSource,
  runPrepareModules,
} from './lib/install.js'
import {
  resolvePackageSources,
  buildSourceOptions,
  detectGithubSshAuth,
  getCachedSshAuth,
  trustedPublishers,
} from './lib/packageSources.js'
import {
  formatCatalogRowPlain,
  formatLegendLine,
  formatDetailPanel,
  formatHeaderLine,
  getColumnWidths,
} from './lib/tuiFormat.js'
import {
  radarSpinner,
  progressTrack,
  statusPrefix,
  spinnerFrameCount,
} from './lib/tuiAscii.js'
import {
  getClientStatus,
  startDev,
  stopDev,
  waitForDev,
  devLogPath,
  formatSparkline,
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
  npm: '#7ee787',
  git: 'cyan',
  local: '#ff79c6',
  add: '#7ee787',
  remove: 'red',
  label: '#a6adc8',
  borderActive: 'white',
}

const FORMAT_COLORS = {
  npm: C.npm,
  git: C.git,
  local: C.local,
  warn: C.warn,
  add: C.add,
  remove: C.remove,
  accent: C.accent,
  muted: C.muted,
}

/** Text color only — no bg fill so the terminal theme shows through. */
function flatStyle(fg = 'white') {
  return { fg }
}

/** Colored border lines + label (no panel fill). */
function panelStyle(borderFg, fg = 'white') {
  return {
    fg,
    border: { fg: borderFg },
    label: { fg },
  }
}

const LIST_SCROLLBAR = {
  ch: '│',
  track: { ch: ' ' },
  style: { fg: C.borderDim },
}

const LIST_STYLE = {
  fg: 'white',
  item: { fg: 'white' },
  scrollbar: { fg: C.borderDim },
  selected: { fg: C.accent, bold: true },
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
  const isKeyFirstLetter = key !== null && key.toLowerCase() === first.toLowerCase()
  const hint = (key !== null && !isKeyFirstLetter) ? keyHint(key) : ''
  return `{${C.accent}-fg}${first}{/}{white-fg}${rest}{/}${hint}`
}

/** @param {string} title @param {string | null} [key] */
function cardLabel(title, key = null) {
  return ` ${cardTitle(title, key)} `
}

const MEM_HISTORY_LEN = 30
const LEGEND_ROWS = 1
const TAB_ROWS = 1

function areConfigsEqual(c1, c2) {
  if (!c1 || !c2) return false
  if (shortName(c1.theme ?? '') !== shortName(c2.theme ?? '')) return false
  if ((c1.apps ?? []).length !== (c2.apps ?? []).length) return false
  if ((c1.modules ?? []).length !== (c2.modules ?? []).length) return false

  const apps1 = [...(c1.apps ?? [])].sort()
  const apps2 = [...(c2.apps ?? [])].sort()
  for (let i = 0; i < apps1.length; i++) {
    if (apps1[i] !== apps2[i]) return false
  }

  const mods1 = [...(c1.modules ?? [])].sort()
  const mods2 = [...(c2.modules ?? [])].sort()
  for (let i = 0; i < mods1.length; i++) {
    if (mods1[i] !== mods2[i]) return false
  }

  return true
}

const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
function stripAnsi(str) {
  return str.replace(ansiRegex, '')
}

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

  function getGitStatus(root) {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()

      const porcelain = execSync('git status --porcelain', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()

      if (!porcelain) {
        return { branch, status: 'clean' }
      }

      const lines = porcelain.split('\n').filter(Boolean)
      const modifiedCount = lines.filter(l => !l.startsWith('??')).length
      const untrackedCount = lines.filter(l => l.startsWith('??')).length

      const parts = []
      if (modifiedCount > 0) parts.push(`${modifiedCount} mod`)
      if (untrackedCount > 0) parts.push(`${untrackedCount} untracked`)
      return { branch, status: parts.join(', ') || 'clean' }
    } catch {
      return { branch: '—', status: 'unknown' }
    }
  }

  let nuxtVersion = '—'
  let pnpmVersion = '—'
  try {
    const pkg = JSON.parse(readFileSync(join(workspaceRoot, 'package.json'), 'utf8'))
    nuxtVersion = pkg.devDependencies?.nuxt || pkg.dependencies?.nuxt || '—'
    pnpmVersion = (pkg.packageManager || '').replace('pnpm@', '') || '—'
  } catch {
    // Ignore
  }

  let isWritingConfig = false
  let configWatcher = null
  let configWatchTimeout = null
  let logWatcher = null

  let catalog = []
  let catalogCacheAge = ''
  let activeTab = 'module'
  let pendingTheme = config.theme
  /** @type {Map<string, boolean>} */
  const pendingPackages = new Map()
  /** @type {Map<string, import('./lib/packageSources.js').InstallSourceChoice>} */
  const installChoices = new Map()
  let statusLine = ''
  let lastTone = 'info'
  let confirmDialogOpen = false
  let devPhase = 'idle'
  let clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
  /** @type {number[]} */
  const memHistory = []
  let spinnerFrame = 0
  let showcaseIndex = 0
  let spinnerTimer = null
  let saveProgress = null
  let currentColumns = getColumnWidths(76)
  let settingsOpen = false
  let menuOpen = false
  let installWizardOpen = false
  /** @type {string[]} */
  let installWizardQueue = []
  let installWizardIndex = 0
  /** @type {import('./lib/packageSources.js').SourceOption[]} */
  let installWizardOptions = []
  let installWizardUntrusted = false
  let installWizardConfirmUntrusted = false
  let sortPickerOpen = false
  let sshAuthStatus = getCachedSshAuth(workspaceRoot)
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

  const HEADER_ROWS = 0
  const MAIN_TOP = 0
  const CLIENT_PANEL_H = 11
  const PANELS_TOP = MAIN_TOP + CLIENT_PANEL_H + 1

  const clientBox = blessed.box({
    parent: screen,
    top: MAIN_TOP,
    left: 0,
    width: '58%-1',
    height: CLIENT_PANEL_H,
    tags: true,
    border: { type: 'line' },
    style: panelStyle(C.border),
    label: ` {bold}{${C.accent}-fg}Desktop{/}{/} control panel · ${keyHint('m')} menu · ${keyHint('g')} settings `,
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
    bottom: 6,
    tags: true,
    border: { type: 'line' },
    style: panelStyle(C.borderDim),
    label: cardLabel('Catalog'),
  })

  const logsBox = blessed.box({
    parent: screen,
    border: { type: 'line' },
    style: panelStyle(C.borderDim),
    label: cardLabel('Logs', 'l'),
    tags: true,
    parseAnsi: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: LIST_SCROLLBAR,
    mouse: true,
    keys: true,
    top: PANELS_TOP,
    left: '58%',
    width: '42%',
    bottom: 6,
  })

  const tabBar = blessed.box({
    parent: catalogBox,
    top: 0,
    left: 1,
    width: '100%-2',
    height: TAB_ROWS,
    tags: true,
    content: '',
    style: flatStyle(),
  })

  const headerBar = blessed.box({
    parent: catalogBox,
    top: TAB_ROWS + 1,
    left: 1,
    width: '100%-2',
    height: 1,
    tags: true,
    content: '',
    style: flatStyle(C.muted),
  })

  const catalogList = blessed.list({
    parent: catalogBox,
    top: TAB_ROWS + 2,
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

  const detailDivider = blessed.box({
    parent: catalogBox,
    bottom: 8,
    left: 1,
    width: '100%-2',
    height: 1,
    tags: true,
    content: '',
    style: flatStyle(C.borderDim),
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

  function layoutCatalogPanel() {
    const cols = screen.width ?? 80
    const rows = screen.height ?? 24

    const showLogs = isDevServerUp() && cols >= 120

    if (showLogs) {
      logsBox.show()
      
      clientBox.position.width = '40%-1'
      
      metricsBox.position.left = '40%'
      metricsBox.position.width = '28%-1'
      
      catalogBox.position.width = '68%-1'
      
      logsBox.position.left = '68%'
      logsBox.position.width = '32%'
      logsBox.position.top = MAIN_TOP
      logsBox.position.height = rows - MAIN_TOP - 6
    } else {
      logsBox.hide()
      if (screen.focused === logsBox) {
        focusCatalog()
      }
      
      clientBox.position.width = '58%-1'
      
      metricsBox.position.left = '58%'
      metricsBox.position.width = '42%'
      
      catalogBox.position.width = '100%'
    }

    const detailH = rows < 26 ? 4 : rows < 34 ? 5 : 7
    catalogBox.position.height = rows - PANELS_TOP - 6

    Object.assign(detailBox.position, {
      bottom: 1,
      left: 1,
      width: '100%-2',
      height: detailH,
      top: undefined,
      right: undefined,
    })

    Object.assign(detailDivider.position, {
      bottom: detailH + 1,
      left: 1,
      width: '100%-2',
      height: 1,
      top: undefined,
      right: undefined,
    })

    Object.assign(headerBar.position, {
      top: TAB_ROWS + 1,
      left: 1,
      width: '100%-2',
      height: 1,
      bottom: undefined,
      right: undefined,
    })

    Object.assign(catalogList.position, {
      top: TAB_ROWS + 2,
      left: 1,
      width: '100%-2',
      bottom: detailH + 2,
      height: undefined,
      right: undefined,
    })

    const catalogBoxWidth = catalogBox.width || (showLogs ? Math.floor(cols * 0.68) : cols)
    const targetWidth = Math.max(40, catalogBoxWidth - 4)
    currentColumns = getColumnWidths(targetWidth)
    detailDivider.setContent(`{${C.borderDim}-fg}${ '─'.repeat(targetWidth) }{/}`)

    clientBox.emit('resize')
    metricsBox.emit('resize')
    catalogBox.emit('resize')
    detailBox.emit('resize')
    detailDivider.emit('resize')
    catalogList.emit('resize')
    logsBox.emit('resize')
    headerBar.emit('resize')
  }

  layoutCatalogPanel()
  screen.on('resize', () => {
    renderAll()
  })

  const helpBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 6,
    tags: true,
    border: { type: 'line' },
    label: cardLabel('Status & Shortcuts'),
    style: panelStyle(C.borderDim, C.muted),
  })

  const settingsOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 62,
    height: 18,
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
    height: 4,
    tags: true,
    style: flatStyle(C.muted),
  })

  const githubInput = blessed.textbox({
    parent: settingsOverlay,
    top: 6,
    left: 2,
    width: '100%-4',
    height: 3,
    inputOnFocus: true,
    keys: true,
    mouse: true,
    style: {
      fg: 'white',
      focus: { border: { fg: C.accent } },
      border: { fg: C.borderDim },
      label: { fg: 'white' },
    },
    border: { type: 'line' },
    label: cardLabel('GitHub username (fork clones)'),
  })

  const trustedOrgsInput = blessed.textbox({
    parent: settingsOverlay,
    top: 10,
    left: 2,
    width: '100%-4',
    height: 3,
    inputOnFocus: true,
    keys: true,
    mouse: true,
    style: {
      fg: 'white',
      focus: { border: { fg: C.accent } },
      border: { fg: C.borderDim },
      label: { fg: 'white' },
    },
    border: { type: 'line' },
    label: cardLabel('Trusted orgs (comma-separated)'),
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

  const installWizardOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 68,
    height: 16,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    label: ' Install source ',
    style: panelStyle(C.accent),
  })

  const installWizardHeader = blessed.box({
    parent: installWizardOverlay,
    top: 1,
    left: 2,
    width: '100%-4',
    height: 3,
    tags: true,
    style: flatStyle(C.muted),
  })

  const installWizardWarning = blessed.box({
    parent: installWizardOverlay,
    top: 4,
    left: 2,
    width: '100%-4',
    height: 2,
    hidden: true,
    tags: true,
    style: flatStyle(C.warn),
  })

  const installWizardList = blessed.list({
    parent: installWizardOverlay,
    top: 6,
    left: 2,
    width: '100%-4',
    height: 6,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: LIST_SCROLLBAR,
    style: LIST_STYLE,
    items: [],
  })

  const installWizardFooter = blessed.box({
    parent: installWizardOverlay,
    bottom: 1,
    left: 2,
    width: '100%-4',
    height: 2,
    tags: true,
    style: flatStyle(C.muted),
  })

  const sortPickerOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 52,
    height: 12,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    label: cardLabel('Sort', 'O'),
    style: panelStyle(C.accent),
  })

  const sortPickerList = blessed.list({
    parent: sortPickerOverlay,
    top: 1,
    left: 1,
    width: '100%-2',
    height: 8,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: LIST_SCROLLBAR,
    style: LIST_STYLE,
  })

  const confirmDialog = blessed.question({
    parent: screen,
    border: 'line',
    height: 'shrink',
    width: 'half',
    top: 'center',
    left: 'center',
    label: cardLabel('Confirm Refresh'),
    style: panelStyle(C.accent),
    tags: true,
    hidden: true,
  })

  function overlayBlocksKeys() {
    return settingsOpen || menuOpen || installWizardOpen || sortPickerOpen || confirmDialogOpen
  }

  function pendingQueueSummary() {
    const installs = []
    const removals = []
    for (const [name, on] of pendingPackages) {
      if (on) installs.push(shortName(name))
      else removals.push(shortName(name))
    }
    const themeChange =
      pendingTheme && pendingTheme !== config.theme ? shortName(pendingTheme) : null
    const parts = []
    if (installs.length) parts.push(`+${installs.join(', +')}`)
    if (themeChange) parts.push(`+theme:${themeChange}`)
    if (removals.length) parts.push(`−${removals.join(', −')}`)
    return parts.length ? parts.join('  ') : null
  }

  function catalogFilterOptions() {
    return {
      sortMode: settings.catalogSort,
      config: effectiveInstalledSets(config, pendingPackages, pendingTheme),
    }
  }



  function renderLegendBar() {
    renderHelp()
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
  }

  function sortModeLabel() {
    return CATALOG_SORT_LABELS[normalizeCatalogSort(settings.catalogSort)]
  }

  function applyCatalogSort(mode) {
    settings = { ...settings, catalogSort: mode }
    saveSettings(workspaceRoot, settings)
    renderCatalogList()
    renderLegendBar()
    renderTabs()
    renderDetail()
    setStatus(`Sort → ${sortModeLabel()}`, 'ok')
    screen.render()
  }

  function cycleCatalogSort() {
    const idx = CATALOG_SORT_MODES.indexOf(normalizeCatalogSort(settings.catalogSort))
    const next = CATALOG_SORT_MODES[(idx + 1) % CATALOG_SORT_MODES.length]
    applyCatalogSort(next)
  }

  function formatSortPickerItems() {
    const current = normalizeCatalogSort(settings.catalogSort)
    return CATALOG_SORT_MODES.map((mode) => {
      const bullet = mode === current ? `{${C.accent}-fg}>{/}` : ' '
      const label = CATALOG_SORT_LABELS[mode]
      const desc = CATALOG_SORT_DESCRIPTIONS[mode]
      return `${bullet} {bold}${label.padEnd(10)}{/} {${C.muted}-fg}${desc}{/}`
    })
  }

  function openSortPicker() {
    if (settingsOpen || menuOpen || installWizardOpen || sortPickerOpen) return
    sortPickerOpen = true
    sortPickerOverlay.show()
    sortPickerList.setItems(formatSortPickerItems())
    const idx = CATALOG_SORT_MODES.indexOf(normalizeCatalogSort(settings.catalogSort))
    sortPickerList.select(idx >= 0 ? idx : 0)
    sortPickerList.focus()
    setStatus(`Sort — Enter apply · ${keyHint('o')} quick cycle · Esc close`)
    screen.render()
  }

  function closeSortPicker() {
    sortPickerOpen = false
    sortPickerOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function selectSortAt(index) {
    const mode = CATALOG_SORT_MODES[index]
    if (!mode) return
    closeSortPicker()
    applyCatalogSort(mode)
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

  function renderHelp(tone = null) {
    if (tone !== null) {
      lastTone = tone
    }
    const statusColor = lastTone === 'error' ? C.err : lastTone === 'ok' ? C.accent : C.warn
    const msg = statusLine || defaultStatusHint()
    const progress =
      saveProgress !== null
        ? ` ${progressTrack(saveProgress.step, saveProgress.total, 0)} ${saveProgress.label}`
        : ''

    const listCount = catalog.length
      ? `{bold}${catalog.length}{/} packages`
      : 'loading…'
    const listCache = catalogCacheAge ? ` · ${catalogCacheAge}` : ''
    const trusted = trustedPublishers(settings.githubOrgs, settings.githubUser).join(', ')
    const ghUser = settings.githubUser
      ? `{bold}${settings.githubUser}{/}`
      : `{${C.muted}-fg}(not set){/}`
    const ssh = sshAuthStatus?.available
      ? `{${C.accent}-fg}SSH ok{/} as ${sshAuthStatus.githubLogin ?? '?'}`
      : `{${C.warn}-fg}SSH off{/} — HTTPS`
    const queue = pendingQueueSummary()
    const queueLine = queue
      ? `{${C.muted}-fg}Queue:{/} {bold}${queue}{/} · ${keyHint('w')} save`
      : `${keyHint('w')} save changes`

    helpBar.setContent(
      [
        `  {bold}{${statusColor}-fg}${msg}{/}{/}${progress}`,
        `  GitHub: ${ghUser}  ·  ${ssh}  ·  {${C.muted}-fg}Trust:{/} ${trusted}  ·  Catalog: ${listCount}${listCache}  ·  ${queueLine}`,
        `  Legend: {${C.add}-fg}[+]{/} add  {${C.remove}-fg}[-]{/} remove  {${C.accent}-fg}[*]{/} on desktop  |  {${C.npm}-fg}NPM{/} registry  {${C.git}-fg}GIT{/} repo  {${C.local}-fg}LOC{/} workspace  |  {${C.warn}-fg}WRN{/} untrusted`,
        `  Shortcuts: ↑↓ Space toggle  ${keyHint('1')}${keyHint('2')}${keyHint('3')} tabs  ${keyHint('w')} save  ${keyHint('O')} sort  ${keyHint('m')} menu  ${keyHint('q')} quit  ${keyHint('r')} refresh`,
      ].join('\n'),
    )
  }

  function setStatus(msg, tone = 'info') {
    statusLine = `${statusPrefix(tone)}${msg}`
    renderHelp(tone)
    screen.render()
  }

  function handleExternalConfigChange() {
    if (isWritingConfig) return
    if (configWatchTimeout) {
      clearTimeout(configWatchTimeout)
    }
    configWatchTimeout = setTimeout(() => {
      try {
        const newConfig = readDesktopConfig(paths.config, workspaceRoot)
        if (!areConfigsEqual(config, newConfig)) {
          config = newConfig
          deps = readDesktopDependencies(paths.packageJson)
          
          for (const [name, on] of pendingPackages.entries()) {
            const isApp = name.startsWith('app-') || inferKind(shortName(name)) === 'app'
            const list = isApp ? (config.apps ?? []) : (config.modules ?? [])
            if (on === list.includes(name)) {
              pendingPackages.delete(name)
            }
          }
          if (pendingTheme === config.theme || !pendingTheme) {
            pendingTheme = config.theme
          }

          renderAll()
          setStatus('Configuration reloaded from disk', 'ok')
        }
      } catch (err) {
        setStatus(`Error reading config: ${err.message}`, 'error')
      }
    }, 200)
  }

  function startConfigWatcher() {
    if (configWatcher) {
      configWatcher.close()
    }
    try {
      configWatcher = watch(paths.config, (eventType) => {
        if (eventType === 'rename') {
          // Re-bind watcher to the new inode (e.g. VS Code atomic save)
          setTimeout(startConfigWatcher, 100)
        }
        if (eventType === 'change' || eventType === 'rename') {
          handleExternalConfigChange()
        }
      })
      configWatcher.on('error', () => {
        setTimeout(startConfigWatcher, 500)
      })
    } catch (err) {
      setTimeout(startConfigWatcher, 1000)
    }
  }

  function readLogs() {
    const logFile = devLogPath(workspaceRoot)
    if (!existsSync(logFile)) {
      logsBox.setContent('{gray-fg}No logs available.{/}')
      screen.render()
      return
    }
    try {
      const stats = statSync(logFile)
      const streamSize = Math.min(stats.size, 10000)
      if (streamSize === 0) {
        logsBox.setContent('{gray-fg}Logs are empty.{/}')
        screen.render()
        return
      }
      const fd = openSync(logFile, 'r')
      const buffer = Buffer.alloc(streamSize)
      readSync(fd, buffer, 0, streamSize, stats.size - streamSize)
      closeSync(fd)

      const rawText = buffer.toString('utf8')
      const escapedText = rawText.replace(/{/g, '\\{').replace(/}/g, '\\}')

      const lines = escapedText.split('\n')
      const lastLines = lines.slice(-100).join('\n')

      logsBox.setContent(lastLines)
      logsBox.setScrollPerc(100)
      screen.render()
    } catch (err) {
      logsBox.setContent(`{red-fg}Error reading logs: ${err.message}{/}`)
      screen.render()
    }
  }

  function clearLogsBox() {
    const logFile = devLogPath(workspaceRoot)
    try {
      writeFileSync(logFile, '')
    } catch {
      /* ignore */
    }
    logsBox.setContent('{gray-fg}Waiting for dev server logs...{/}')
    logsBox.setScrollPerc(0)
    screen.render()
  }

  function startLogWatcher() {
    if (logWatcher) logWatcher.close()
    const logFile = devLogPath(workspaceRoot)
    readLogs()
    try {
      logWatcher = watch(logFile, (eventType) => {
        if (eventType === 'change') {
          readLogs()
        }
      })
      logWatcher.on('error', () => {
        setTimeout(startLogWatcher, 1000)
      })
    } catch {
      setTimeout(startLogWatcher, 1000)
    }
  }

  function stopLogWatcher() {
    if (logWatcher) {
      logWatcher.close()
      logWatcher = null
    }
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
      spinnerFrame = (spinnerFrame + 1) % spinnerFrameCount
      statusLine = `${radarSpinner(spinnerFrame)} ${message}`
      renderHelp('info')
      screen.render()
    }, 150)
  }

  function stopSpinner() {
    if (spinnerTimer) {
      clearInterval(spinnerTimer)
      spinnerTimer = null
    }
  }

  function renderSettingsPanel() {
    const ssh = sshAuthStatus?.available
      ? `{${C.accent}-fg}SSH authenticated{/} as ${sshAuthStatus.githubLogin ?? '?'}`
      : `{${C.warn}-fg}SSH not available{/} — use HTTPS git clones`
    settingsInfo.setContent(
      [
        ssh,
        `{${C.muted}-fg}GitHub username enables fork clone options in the install wizard.{/}`,
        `{${C.muted}-fg}Tab between fields · Enter save · t test SSH{/}`,
      ].join('\n'),
    )
  }

  async function testSshFromSettings() {
    setStatus('Testing SSH to GitHub…')
    screen.render()
    sshAuthStatus = await detectGithubSshAuth(workspaceRoot, { force: true })
    renderSettingsPanel()
    setStatus(sshAuthStatus.message ?? 'SSH test complete', sshAuthStatus.available ? 'ok' : 'error')
    screen.render()
  }

  function openSettings() {
    settingsOpen = true
    settingsOverlay.show()
    renderSettingsPanel()
    githubInput.setValue(settings.githubUser ?? '')
    trustedOrgsInput.setValue((settings.githubOrgs ?? ['owdproject']).join(', '))
    githubInput.focus()
    setStatus('Settings — Tab fields · Enter save · t test SSH · Esc cancel')
    screen.render()
  }

  function closeSettings() {
    settingsOpen = false
    settingsOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function openMenu() {
    if (settingsOpen || installWizardOpen || sortPickerOpen) return

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
    const orgsRaw = trustedOrgsInput.getValue().trim()
    const githubOrgs = orgsRaw
      ? orgsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : ['owdproject']
    settings = { ...settings, githubUser: user, githubOrgs }
    saveSettings(workspaceRoot, settings)
    closeSettings()
    renderClient()
    renderCatalogList()
    renderDetail()
    setStatus(user ? `Settings saved — GitHub user ${user}` : 'Settings saved', 'ok')
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
      ` ${tab('app', 'Apps', '1')}  ${tab('module', 'Modules', '2')}  ${tab('theme', 'Themes', '3')}  |  {${C.muted}-fg}Sort:{/} {bold}${sortModeLabel()}{/}  ${keyHint('o')}${keyHint('O')}`,
    )
  }



  const npmDownloads = {
    '@owdproject/core': 410,
    '@owdproject/app-about': 8,
    '@owdproject/app-todo': 12,
    '@owdproject/app-terminal': 24,
    '@owdproject/module-fs': 52,
    '@owdproject/module-persistence': 38,
    '@owdproject/theme-gnome': 14,
    '@owdproject/theme-win95': 36,
  }

  async function loadNpmDownloads() {
    try {
      const pkgs = ['@owdproject/core']
      for (const item of catalog) {
        const name = item.org && item.org !== 'workspace' ? `@${item.org}/${item.shortName}` : item.shortName
        pkgs.push(name)
      }
      
      await Promise.allSettled(
        pkgs.map(async (name) => {
          try {
            const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${name}`)
            const data = await res.json()
            if (data && typeof data.downloads === 'number') {
              npmDownloads[name] = data.downloads
            }
          } catch {
            // Ignore single fetch failure
          }
        })
      )
      
      renderClient()
      screen.render()
    } catch (err) {
      // Ignore
    }
  }

  function getShowcaseItems() {
    const items = [
      `{bold}Discord Server{/} · Join the community for help: https://discord.gg/owd`,
      `{bold}Tip{/} · Press {${C.accent}-fg}Space{/} on any app or module to toggle installation/removal`,
      `{bold}Tip{/} · Press {${C.accent}-fg}1{/}, {${C.accent}-fg}2{/}, or {${C.accent}-fg}3{/} keys to switch catalog tabs`,
      `{bold}Tip{/} · Press {${C.accent}-fg}w{/} to review changes and launch the package install wizard`,
      `{bold}Tip{/} · Press {${C.accent}-fg}g{/} to configure your GitHub user for forks/clones`,
      `{bold}Tip{/} · Press {${C.accent}-fg}o{/} to cycle catalog sorting, or {${C.accent}-fg}O{/} for sort menu`,
      `{bold}Tip{/} · Press {${C.accent}-fg}m{/} to open the command action menu`,
      `{bold}Tip{/} · Click anywhere on the bottom status bar to force-refresh catalog`,
      `{bold}Tip{/} · Press {${C.accent}-fg}s{/} to start dev server, {${C.accent}-fg}x{/} to stop, and {${C.accent}-fg}R{/} to reboot`,
      `{bold}Tip{/} · Press {${C.accent}-fg}l{/} to focus Logs; press {${C.accent}-fg}Esc{/} to return to Catalog`,
      `{bold}Feature{/} · Playground environments are automatically detected at startup`,
      `{bold}Feature{/} · Workspace materialization targets symlinks before cloning`,
    ]

    const apps = catalog.filter((e) => e.kind === 'app')
    const mods = catalog.filter((e) => e.kind === 'module')
    const themes = catalog.filter((e) => e.kind === 'theme')

    const totalStars = catalog.reduce((acc, item) => acc + (item.stars ?? 0), 0)
    if (totalStars > 0) {
      items.push(`{bold}GitHub Stats{/} · ${totalStars} total stars across all catalog modules`)
    }

    if (catalog.length > 0) {
      const sortedByStars = [...catalog].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
      const topStar = sortedByStars[0]
      if (topStar && topStar.stars > 0) {
        items.push(`{bold}Trending{/} · {bold}{${C.accent}-fg}${topStar.shortName}{/}{/} is most popular with ★${topStar.stars} stars`)
      }
    }

    const coreDownloads = npmDownloads['@owdproject/core']
    if (coreDownloads !== undefined) {
      items.push(`{bold}NPM Downloads{/} · core package {bold}@owdproject/core{/} got ${coreDownloads} downloads last week`)
    }

    let totalCatalogDownloads = 0
    let topDownloadItem = null
    let topDownloadCount = 0

    for (const item of catalog) {
      const name = item.org && item.org !== 'workspace' ? `@${item.org}/${item.shortName}` : item.shortName
      const dls = npmDownloads[name]
      if (dls !== undefined) {
        totalCatalogDownloads += dls
        if (dls > topDownloadCount) {
          topDownloadCount = dls
          topDownloadItem = item
        }
      }
    }

    if (totalCatalogDownloads > 0) {
      items.push(`{bold}NPM Stats{/} · ${totalCatalogDownloads} total weekly downloads for OWD catalog modules`)
    }
    if (topDownloadItem && topDownloadCount > 0) {
      items.push(`{bold}NPM Stats{/} · {bold}{${C.accent}-fg}${topDownloadItem.shortName}{/}{/} is top with ${topDownloadCount} weekly downloads`)
    }

    const maxDescLen = 25

    if (apps.length > 0) {
      const app = apps[showcaseIndex % apps.length]
      const name = app.org && app.org !== 'workspace' ? `@${app.org}/${app.shortName}` : app.shortName
      const dls = npmDownloads[name]
      const dlsStr = dls !== undefined ? ` · ${dls} downloads/wk` : ''
      const starsStr = app.stars > 0 ? ` · ★${app.stars}` : ''
      const descStr = app.description
        ? ` · {${C.muted}-fg}${app.description.length > maxDescLen ? app.description.slice(0, maxDescLen) + '...' : app.description}{/}`
        : ''
      items.push(`{bold}App Spotlight{/} · {bold}{${C.accent}-fg}${app.shortName}{/}{/}${starsStr}${dlsStr}${descStr}`)
    }

    if (mods.length > 0) {
      const mod = mods[showcaseIndex % mods.length]
      const name = mod.org && mod.org !== 'workspace' ? `@${mod.org}/${mod.shortName}` : mod.shortName
      const dls = npmDownloads[name]
      const dlsStr = dls !== undefined ? ` · ${dls} downloads/wk` : ''
      const starsStr = mod.stars > 0 ? ` · ★${mod.stars}` : ''
      const descStr = mod.description
        ? ` · {${C.muted}-fg}${mod.description.length > maxDescLen ? mod.description.slice(0, maxDescLen) + '...' : mod.description}{/}`
        : ''
      items.push(`{bold}Module Spotlight{/} · {bold}{${C.accent}-fg}${mod.shortName}{/}{/}${starsStr}${dlsStr}${descStr}`)
    }

    if (themes.length > 0) {
      const theme = themes[showcaseIndex % themes.length]
      const name = theme.org && theme.org !== 'workspace' ? `@${theme.org}/${theme.shortName}` : theme.shortName
      const dls = npmDownloads[name]
      const dlsStr = dls !== undefined ? ` · ${dls} downloads/wk` : ''
      const starsStr = theme.stars > 0 ? ` · ★${theme.stars}` : ''
      const descStr = theme.description
        ? ` · {${C.muted}-fg}${theme.description.length > maxDescLen ? theme.description.slice(0, maxDescLen) + '...' : theme.description}{/}`
        : ''
      items.push(`{bold}Theme Spotlight{/} · {bold}{${C.accent}-fg}${theme.shortName}{/}{/}${starsStr}${dlsStr}${descStr}`)
    }

    return items
  }

  function renderClient() {
    const http = clientStatus.http
    let stateLabel
    let dotChar
    let dotColor

    const serverRunning = clientStatus.running || http.up
    if (devPhase === 'starting') {
      stateLabel = 'STARTING'
      dotChar = '…'
      dotColor = C.warn
    } else if (serverRunning) {
      stateLabel = 'RUNNING'
      dotChar = '●'
      dotColor = C.accent
      devPhase = 'running'
    } else {
      stateLabel = 'STOPPED'
      dotChar = '○'
      dotColor = C.err
      devPhase = 'stopped'
    }

    clientBox.style.border.fg = serverRunning ? C.focus : C.border

    const serverDetails = clientStatus.pid
      ? `  PID ${clientStatus.pid}   ${clientStatus.stats.memMb} MiB   ${clientStatus.stats.threads} threads`
      : `  Dev server inactive — press ${keyHint('s')} to start`

    const docsInstalled = hasDocsModuleInstalled(config, deps)
    let extraLine = null
    if (playgroundActive && playgroundLabel) {
      extraLine = `  Playground: {bold}${playgroundLabel}{/} active`
      if (docsInstalled && serverRunning) {
        extraLine += `  ·  Docs: ${keyHint('i')} open`
      }
    } else if (docsInstalled) {
      extraLine = serverRunning
        ? `  Docs: ${keyHint('i')} open ${docsBasePathFromConfig(config)}`
        : `  Docs: ${keyHint('s')} start server to view documentation`
    }
    if (!extraLine) {
      extraLine = `  System: ready`
    }

    const configRestartLine =
      configRestartHintUntil > Date.now() && serverRunning
        ? `  {${C.devMode}-fg}ℹ{/} {${C.muted}-fg}desktop.config.ts updated — Nuxt is restarting (see dev server log){/}`
        : null

    const workspaceShortPath = workspaceRoot.replace(process.env.HOME || '', '~')

    // Git info
    const gitInfo = getGitStatus(workspaceRoot)
    const gitText = `branch: ${gitInfo.branch}  ·  status: ${gitInfo.status}`

    // Versions
    const versionsText = `Node ${process.version}  ·  Nuxt ${nuxtVersion}  ·  PNPM ${pnpmVersion}`

    const workspaceLine = configRestartLine
      ? configRestartLine
      : `  {${C.muted}-fg}Workspace{/}  ${workspaceShortPath}`

    const contentLines = [
      `  {${dotColor}-fg}${dotChar}{/} {bold}${stateLabel}{/}  http://127.0.0.1:${settings.devPort}`,
      serverDetails,
      extraLine,
      '',
      workspaceLine,
      `  {${C.muted}-fg}Git{/}        ${gitText}`,
      `  {${C.muted}-fg}Versions{/}   ${versionsText}`,
      '',
    ]

    const showcaseItems = getShowcaseItems()
    if (showcaseItems.length > 0) {
      const showcaseItem = showcaseItems[showcaseIndex % showcaseItems.length]
      const boxWidth = clientBox.width || 50
      const borderLine = ` {${C.borderDim}-fg}${ '─'.repeat(Math.max(10, boxWidth - 4)) }{/}`
      contentLines.push(borderLine)
      contentLines.push(`  ${showcaseItem}`)
    }

    clientBox.setContent(contentLines.join('\n'))

    renderHelp()
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

    const themePendingChange = pendingTheme && pendingTheme !== config.theme
    const unsaved = pendingPackages.size + (themePendingChange ? 1 : 0)
    const unsavedLine =
      unsaved > 0
        ? `  {${C.warn}-fg}${unsaved}{/} {${C.muted}-fg}unsaved — ${keyHint('w')} save`
        : null

    metricsBox.setContent(
      [
        `  {${C.muted}-fg}Memory{/} {bold}${memLabel}{/}`,
        `  {${C.accent}-fg}${spark}{/}`,
        '',
        `  {${C.muted}-fg}${tabLabel}{/}  {bold}${onDesktop}{/} {${C.muted}-fg}on desktop{/}`,
        '',
        `  {${C.muted}-fg}Theme{/} {bold}${themeShort}{/}${themePending}  ·  ${apps} apps · ${mods} modules`,
        unsavedLine ? '' : null,
        unsavedLine,
      ]
        .filter((x) => x !== null)
        .join('\n'),
    )
  }

  function formatCatalogRow(item) {
    if (activeTab === 'theme') {
      const selected = shortName(pendingTheme ?? config.theme ?? '') === shortName(item.name)
      const pendingChange =
        pendingTheme &&
        shortName(pendingTheme) !== shortName(config.theme ?? '') &&
        shortName(item.name) === shortName(pendingTheme)
      return formatCatalogRowPlain(
        {
          ...item,
          installed: selected && !pendingChange,
          pending: pendingChange ? true : undefined,
        },
        { colors: FORMAT_COLORS },
      )
    }

    const pending = pendingPackages.get(item.name)
    return formatCatalogRowPlain(
      {
        ...item,
        pending,
        isNew: activeTab === 'module' && item.isNew,
        isRecent: activeTab === 'module' && item.isRecent,
      },
      { colors: FORMAT_COLORS },
    )
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

    const kind = KINDS[activeTab]
    const target = `${kind.workspaceDir}/${item.shortName}`
    const detailWidth = currentColumns.sel + currentColumns.name + currentColumns.sources + currentColumns.publisher + currentColumns.meta + 4
    detailBox.setContent(formatDetailPanel(item, target, FORMAT_COLORS, detailWidth))
  }

  function renderAll() {
    layoutCatalogPanel()
    renderLegendBar()
    headerBar.setContent(` ${formatHeaderLine(FORMAT_COLORS, currentColumns)}`)
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
    const hint =
      activeTab === 'theme'
        ? `${KINDS[activeTab].label} — Space select theme · ${keyHint('w')} save`
        : `${KINDS[activeTab].label} — Space toggle · ${keyHint('w')} save`
    setStatus(hint)
  }

  function selectThemeAt(index) {
    const entries = catalogEntries()
    const item = entries[index]
    if (!item) return
    if (pendingTheme === item.name) {
      pendingTheme = config.theme
      setStatus(`Restored theme to default`)
    } else {
      pendingTheme = item.name
      setStatus(`Theme → ${item.shortName} — ${keyHint('w')} save`, 'ok')
    }
    renderCatalogList()
    renderMetrics()
    renderClient()
    renderDetail()
    screen.render()
  }

  function toggleCatalogAt(index) {
    if (activeTab === 'theme') {
      selectThemeAt(index)
      return
    }

    const entries = catalogEntries()
    const item = entries[index]
    if (!item) return

    if (pendingPackages.has(item.name)) {
      pendingPackages.delete(item.name)
      installChoices.delete(item.name)
      setStatus(`Restored ${item.shortName}`)
    } else {
      const next = !item.installed
      pendingPackages.set(item.name, next)
      setStatus(
        `${next ? 'Queued install' : 'Queued remove'} ${item.shortName} — ${keyHint('w')} review`,
      )
    }

    renderCatalogList()
    renderMetrics()
    renderClient()
    renderDetail()
    screen.render()
  }

  function collectInstallPlan() {
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
    if (nextTheme && shortName(nextTheme) !== shortName(config.theme ?? '')) packagesToInstall.push(nextTheme)

    const enabled = [...nextApps, ...nextModules, nextTheme].filter(Boolean)
    for (const pkg of enabled) {
      if (packagesToInstall.includes(pkg)) continue
      if (!hasLocalWorkspaceSource(workspaceRoot, pkg)) {
        packagesToMaterialize.push(pkg)
      }
    }

    return { packagesToInstall, packagesToMaterialize, nextApps, nextModules, nextTheme }
  }

  function renderInstallWizardPanel() {
    const pkg = installWizardQueue[installWizardIndex]
    if (!pkg) return
    const entry = catalog.find((e) => e.name === pkg)
    const idx = installWizardIndex + 1
    const total = installWizardQueue.length
    installWizardOverlay.setLabel(` Install ${shortName(pkg)} (${idx}/${total}) `)
    installWizardHeader.setContent(
      [
        `{bold}${pkg}{/}`,
        entry?.description ? `{${C.muted}-fg}${entry.description.slice(0, 90)}{/}` : '',
        `{${C.muted}-fg}Git clone creates a full repo under apps/packages/themes with .git{/}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )

    if (installWizardUntrusted && !installWizardConfirmUntrusted) {
      installWizardWarning.show()
      const trusted = trustedPublishers(settings.githubOrgs, settings.githubUser).join(', ')
      installWizardWarning.setContent(
        `{${C.warn}-fg}⚠ Publisher "${entry?.org ?? 'unknown'}" is not trusted (${trusted}). Enter to confirm anyway.{/}`,
      )
      installWizardList.hide()
      installWizardFooter.setContent(
        `{${C.muted}-fg}Enter confirm · s skip · Esc cancel all{/}`,
      )
    } else {
      installWizardWarning.hide()
      installWizardList.show()
      installWizardList.setItems(
        installWizardOptions.map((opt) => {
          const prefix =
            opt.kind === 'npm' ? `{${C.npm}-fg}NPM{/}` : `{${C.git}-fg}GIT{/}`
          return `${prefix}  ${opt.label}`
        }),
      )
      installWizardList.select(0)
      installWizardFooter.setContent(
        `{${C.muted}-fg}↑↓ select source · Enter install · s skip · Esc cancel all{/}`,
      )
    }
  }

  async function openInstallWizardStep() {
    const pkg = installWizardQueue[installWizardIndex]
    if (!pkg) {
      closeInstallWizard()
      await executeInstallPlan()
      return
    }

    const entry = catalog.find((e) => e.name === pkg)
    installWizardUntrusted = entry?.trusted === false
    installWizardConfirmUntrusted = false

    const metadata = await resolvePackageSources(
      shortName(pkg),
      settings,
      workspaceRoot,
      entry ?? {},
    )
    if (!sshAuthStatus) {
      sshAuthStatus = await detectGithubSshAuth(workspaceRoot)
    }
    installWizardOptions = buildSourceOptions(metadata, settings, sshAuthStatus ?? {})

    if (installWizardOptions.length === 0) {
      setStatus(`No install source for ${shortName(pkg)} — skipped`, 'error')
      installWizardIndex++
      await openInstallWizardStep()
      return
    }

    installWizardOpen = true
    installWizardOverlay.setFront()
    installWizardOverlay.show()
    renderInstallWizardPanel()
    installWizardList.focus()
    screen.render()
  }

  function closeInstallWizard() {
    installWizardOpen = false
    installWizardOverlay.hide()
    installWizardQueue = []
    installWizardIndex = 0
    installWizardOptions = []
    installWizardUntrusted = false
    installWizardConfirmUntrusted = false
    focusCatalog()
    screen.render()
  }

  async function skipInstallWizardStep() {
    installWizardIndex++
    if (installWizardIndex >= installWizardQueue.length) {
      closeInstallWizard()
      await executeInstallPlan()
      return
    }
    await openInstallWizardStep()
  }

  async function confirmInstallWizardStep(choice) {
    const pkg = installWizardQueue[installWizardIndex]
    if (!pkg) return
    installChoices.set(pkg, choice)
    installWizardIndex++
    installWizardConfirmUntrusted = false
    if (installWizardIndex >= installWizardQueue.length) {
      closeInstallWizard()
      await executeInstallPlan()
      return
    }
    await openInstallWizardStep()
  }

  async function handleInstallWizardSelect() {
    const pkg = installWizardQueue[installWizardIndex]
    if (!pkg) return

    if (installWizardUntrusted && !installWizardConfirmUntrusted) {
      installWizardConfirmUntrusted = true
      renderInstallWizardPanel()
      installWizardList.focus()
      screen.render()
      return
    }

    const idx = installWizardList.selected
    const option = installWizardOptions[idx]
    if (!option) return
    await confirmInstallWizardStep(option.choice)
  }

  async function startInstallWizard(packagesToInstall) {
    if (packagesToInstall.length === 0) {
      await executeInstallPlan()
      return
    }
    installWizardQueue = [...packagesToInstall]
    installWizardIndex = 0
    installChoices.clear()
    await openInstallWizardStep()
  }

  async function executeInstallPlan() {
    stopSpinner()
    const plan = collectInstallPlan()
    const { packagesToInstall, packagesToMaterialize } = plan
    let { nextApps, nextModules, nextTheme } = plan

    const wizardSet = new Set([...packagesToInstall, ...packagesToMaterialize])
    const confirmed = (pkg) => !wizardSet.has(pkg) || installChoices.has(pkg)
    nextApps = nextApps.filter(confirmed)
    nextModules = nextModules.filter(confirmed)
    if (nextTheme && wizardSet.has(nextTheme) && !installChoices.has(nextTheme)) {
      nextTheme = config.theme
      pendingTheme = config.theme
    }

    const toInstall = packagesToInstall.filter((pkg) => installChoices.has(pkg))
    const toMaterialize = packagesToMaterialize.filter((pkg) => installChoices.has(pkg))

    const totalSteps = toInstall.length + toMaterialize.length + 2
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

      for (const pkg of toInstall) {
        const choice = installChoices.get(pkg)
        bump(`Installing ${shortName(pkg)}…`)
        await installPackage(pkg, settings, workspaceRoot, {
          stdio: 'pipe',
          sourceChoice: choice,
        })
        if (choice?.type === 'git') didClone = true
      }

      for (const pkg of toMaterialize) {
        const choice = installChoices.get(pkg)
        if (!choice || choice.type === 'npm') continue
        bump(`Cloning ${shortName(pkg)}…`)
        await materializeToWorkspace(pkg, settings, workspaceRoot, {
          stdio: 'pipe',
          sourceChoice: choice,
        })
        didClone = true
      }

      if (didClone) {
        bump('prepare:modules…')
        runPrepareModules(workspaceRoot, 'pipe')
      }

      bump('Writing config…')
      isWritingConfig = true
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
      installChoices.clear()
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
      setTimeout(() => {
        isWritingConfig = false
      }, 500)
    } catch (err) {
      isWritingConfig = false
      saveProgress = null
      setStatus(`Save failed: ${err.message}`, 'error')
    }
  }

  async function applyChanges() {
    stopSpinner()
    const { packagesToInstall, packagesToMaterialize } = collectInstallPlan()
    const needsWizard = [...packagesToInstall, ...packagesToMaterialize]

    if (needsWizard.length > 0) {
      await startInstallWizard(needsWizard)
      return
    }

    await executeInstallPlan()
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
    clearLogsBox()
    renderAll()
    startDev(devTarget)
    startLogWatcher()
    clientStatus = await waitForDev(workspaceRoot, settings.devPort)
    stopSpinner()
    devPhase = clientStatus.http.up ? 'running' : 'stopped'
    if (!isDevServerUp()) {
      stopLogWatcher()
    }
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
    stopLogWatcher()
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
    clearLogsBox()
    stopLogWatcher()
    renderAll()
    stopDev(workspaceRoot, clientStatus.pid)
    memHistory.length = 0
    await new Promise((r) => setTimeout(r, 800))
    startDev(devTarget)
    startLogWatcher()
    clientStatus = await waitForDev(workspaceRoot, settings.devPort)
    stopSpinner()
    devPhase = clientStatus.http.up ? 'running' : 'stopped'
    if (!isDevServerUp()) {
      stopLogWatcher()
    }
    renderAll()
    const targetHint = playgroundActive && playgroundLabel ? ` (${playgroundLabel})` : ''
    setStatus(
      clientStatus.http.up
        ? `Dev server rebooted on port ${settings.devPort}${targetHint}`
        : `Reboot failed — check ${devLogPath(workspaceRoot)}`,
      clientStatus.http.up ? 'ok' : 'error',
    )
  }

  async function refreshCatalog({ force = true } = {}) {
    startSpinner(force ? 'Fetching GitHub catalog…' : 'Loading GitHub catalog…')
    try {
      sshAuthStatus = await detectGithubSshAuth(workspaceRoot, { force })
      const result = await loadCatalog(workspaceRoot, settings, { force })
      catalog = result.entries
      catalogCacheAge = result.cacheAge ?? ''
      config = readDesktopConfig(paths.config, workspaceRoot)
      deps = readDesktopDependencies(paths.packageJson)
      pendingTheme = pendingTheme ?? config.theme
      stopSpinner()
      renderAll()
      loadNpmDownloads()
      setStatus(
        force
          ? `Package list: ${catalog.length} from GitHub`
          : `Package list loaded: ${catalog.length} packages (cache: ${catalogCacheAge})`,
        'ok',
      )
    } catch (err) {
      stopSpinner()
      setStatus(`Package list error: ${err.message}`, 'error')
    }
  }

  screen.key(['escape'], () => {
    if (installWizardOpen) {
      closeInstallWizard()
      setStatus('Install cancelled — no changes applied', 'info')
      return
    }
    if (sortPickerOpen) {
      closeSortPicker()
      return
    }
    if (settingsOpen) {
      closeSettings()
      return
    }
    if (menuOpen) {
      closeMenu()
    }
  })

  screen.key(['q', 'C-c'], () => {
    if (installWizardOpen) {
      closeInstallWizard()
      setStatus('Install cancelled', 'info')
      return
    }
    if (sortPickerOpen) {
      closeSortPicker()
      return
    }
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

  screen.key(['m', 'M'], () => {
    if (settingsOpen || installWizardOpen || sortPickerOpen) return
    if (menuOpen) closeMenu()
    else openMenu()
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

  screen.key(['o'], () => {
    if (!overlayBlocksKeys()) cycleCatalogSort()
  })
  screen.key(['O'], () => {
    if (!overlayBlocksKeys()) openSortPicker()
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
  screen.key(['3'], () => {
    if (overlayBlocksKeys()) return
    activeTab = 'theme'
    focusCatalog()
    renderCatalogList()
    restoreCatalogListSelection(catalogEntries(), pendingTheme ?? config.theme)
    renderLegendBar()
    applyFocusStyles()
    renderMetrics()
    renderDetail()
    renderTabs()
    screen.render()
  })

  githubInput.key(['enter'], () => saveSettingsFromOverlay())
  githubInput.key(['escape'], () => closeSettings())
  githubInput.key(['tab'], () => {
    trustedOrgsInput.focus()
    screen.render()
  })
  trustedOrgsInput.key(['enter'], () => saveSettingsFromOverlay())
  trustedOrgsInput.key(['escape'], () => closeSettings())
  trustedOrgsInput.key(['tab'], () => {
    githubInput.focus()
    screen.render()
  })
  settingsOverlay.key(['t', 'T'], () => {
    if (settingsOpen) testSshFromSettings()
  })

  installWizardList.key(['enter'], () => handleInstallWizardSelect())
  installWizardList.key(['s', 'S'], () => skipInstallWizardStep())
  installWizardList.key(['escape'], () => {
    closeInstallWizard()
    setStatus('Install cancelled — no changes applied', 'info')
  })
  installWizardOverlay.key(['s', 'S'], () => skipInstallWizardStep())
  installWizardOverlay.key(['enter'], () => handleInstallWizardSelect())
  installWizardOverlay.key(['escape'], () => {
    closeInstallWizard()
    setStatus('Install cancelled — no changes applied', 'info')
  })

  menuList.on('select', (_item, index) => {
    const entry = MENU_ITEMS[index]
    if (entry) runMenuAction(entry.id)
  })
  menuList.key(['escape'], () => closeMenu())

  sortPickerList.on('select', (_item, index) => selectSortAt(index))
  sortPickerList.key(['enter'], function () {
    selectSortAt(this.selected)
  })
  sortPickerList.key(['escape'], () => closeSortPicker())
  sortPickerOverlay.key(['escape'], () => closeSortPicker())

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

  screen.key(['l', 'L'], () => {
    if (!overlayBlocksKeys() && isDevServerUp() && logsBox.visible) {
      logsBox.focus()
      setStatus('Logs — Use ↑↓ or PageUp/PageDown to scroll · Esc to return focus to Catalog')
    }
  })

  logsBox.key(['escape'], () => {
    focusCatalog()
  })

  helpBar.on('click', () => {
    if (overlayBlocksKeys()) return
    confirmDialogOpen = true
    confirmDialog.ask(' Do you want to force-refresh the GitHub package catalog? ', (err, value) => {
      confirmDialogOpen = false
      if (value) {
        refreshCatalog({ force: true })
      } else {
        screen.render()
      }
    })
  })

  await refreshCatalog({ force: false })
  clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
  devPhase = clientStatus.running ? 'running' : 'stopped'
  focusCatalog()
  if (isDevServerUp()) {
    startLogWatcher()
  }
  renderAll()

  screen.on('destroy', () => {
    if (configWatcher) {
      configWatcher.close()
    }
    stopLogWatcher()
  })

  startConfigWatcher()

  setStatus(
    `Select packages · ${keyHint('w')} opens install wizard · ${keyHint('g')} settings · ${keyHint('s')} server`,
    'info',
  )

  let lastShowcaseTime = Date.now()

  setInterval(async () => {
    const now = Date.now()
    if (now - lastShowcaseTime >= 5000) {
      showcaseIndex++
      lastShowcaseTime = now
    }

    if (devPhase !== 'starting' && !settingsOpen && !overlayBlocksKeys()) {
      clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
      if (clientStatus.stats.memMb > 0) {
        memHistory.push(clientStatus.stats.memMb)
        if (memHistory.length > MEM_HISTORY_LEN) memHistory.shift()
      }
      if (clientStatus.http.up) devPhase = 'running'
      else if (devPhase === 'running') devPhase = 'stopped'
    }
    const serverRunning = isDevServerUp()
    if (serverRunning && !logWatcher) {
      startLogWatcher()
    } else if (!serverRunning && logWatcher) {
      stopLogWatcher()
    }
    renderClient()
    renderMetrics()
    screen.render()
  }, 2000)
}
