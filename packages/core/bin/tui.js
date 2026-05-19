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
} from './lib/workspace.js'
import { readDesktopConfig, writeDesktopConfig, readDesktopDependencies } from './lib/config.js'
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

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: 'Nuxt Desktop',
    dockCorners: false,
  })

  const titleBar = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 2,
    tags: true,
    content: '',
    style: { fg: C.title, bg: 'black' },
  })

  const clientBox = blessed.box({
    parent: screen,
    top: 2,
    left: 0,
    width: '58%',
    height: 8,
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
    top: 2,
    left: '58%',
    width: '42%',
    height: 8,
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
    top: 10,
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
    top: 10,
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

  function installModeLabel() {
    return isWorkspaceInstallMode(settings) ? 'DEV' : 'USER'
  }

  function installModeColor() {
    return isWorkspaceInstallMode(settings) ? C.devMode : C.userMode
  }

  function renderModeHeader() {
    const mode = installModeLabel()
    const color = installModeColor()
    const installHint = isWorkspaceInstallMode(settings)
      ? settings.githubUser
        ? `clone → fork github.com/${settings.githubUser}/<pkg>`
        : 'clone → github.com/owdproject/<pkg>'
      : 'install → npm registry'

    const orgs = [...new Set([...(settings.githubOrgs ?? ['owdproject']), settings.githubUser].filter(Boolean))]
    const catalogLine = `Catalog: GitHub (${orgs.join(' + ')})${catalogCacheAge ? ` · cache ${catalogCacheAge}` : ''}`

    const borderFlash = modeFlash > 0 ? 'white' : color
    titleBar.style.fg = borderFlash

    titleBar.setContent(
      [
        ` {bold}{${C.title}-fg} Nuxt Desktop {/}{/}  {bold}{${color}-fg}[${mode}]{/}{/}  {${C.muted}-fg}${installHint}{/}`,
        ` {${C.muted}-fg}${catalogLine}{/}`,
      ].join('\n'),
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

  function renderHelp(tone = 'info') {
    const statusColor = tone === 'error' ? C.err : tone === 'ok' ? C.accent : C.warn
    const msg = statusLine || 'Ready — edit then press s to save'
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
        `{${C.focus}-fg}▸{/} {bold}${panelLabel()}{/}  {bold}{${installModeColor()}-fg}[${installModeLabel()}]{/}{/}`,
        navLine,
        `{${C.muted}-fg}Actions{/}  {bold}s{/} save   {bold}r{/} refresh   {bold}d{/} {bold}USER↔DEV{/} install   {bold}n{/} Nuxt dev   {bold}g{/} settings   {bold}b{/} build   {bold}q{/} quit`,
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
    const fork = settings.githubUser
      ? `github.com/${settings.githubUser}/<pkg>`
      : 'github.com/owdproject/<pkg>'
    settingsInfo.setContent(
      [
        `{bold}Install mode{/}  {${color}-fg}${mode}{/}`,
        isWorkspaceInstallMode(settings)
          ? `{${C.muted}-fg}Save clones to apps/ packages/ themes/{/}`
          : `{${C.muted}-fg}Save installs from npm{/}`,
        `{${C.muted}-fg}Toggle with {bold}d{/} · fork: ${fork}{/}`,
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

    const pidLine = clientStatus.pid
      ? `PID ${clientStatus.pid}   ${clientStatus.stats.memMb} MiB   ${clientStatus.stats.threads} thr`
      : http.up
        ? 'responding on port (process not matched)'
        : 'press [n] to start dev server'

    const warnDev =
      isWorkspaceInstallMode(settings) && !settings.githubUser
        ? `\n  {${C.warn}-fg}⚠ Dev mode: set GitHub user [g] to clone your forks{/}`
        : ''

    clientBox.setContent(
      [
        `  {${dotColor}-fg}${dotChar}{/}  {bold}${stateLabel}{/}   http://127.0.0.1:${settings.devPort}   HTTP ${http.status || '—'}`,
        `  ${pidLine}`,
        `  {${C.muted}-fg}Theme:{/} {bold}${(pendingTheme ?? config.theme ?? '—').replace('@owdproject/', '')}{/}  {${C.muted}-fg}│ save [s]{/}`,
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
        ? `  {${C.warn}-fg}${unsaved}{/} {${C.muted}-fg}unsaved — [s] save{/}`
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
      setStatus(`Theme → ${item.shortName} (press [s] to save)`, 'ok')
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
          ? `{${C.warn}-fg}[npm] in config — save [s] to clone into workspace{/}`
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
    setStatus(`${KINDS[activeTab].label} — Space toggles, s saves when done`)
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
      writeDesktopConfig(paths.config, workspaceRoot, {
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

  async function toggleDev() {
    if (devPhase === 'running' || clientStatus.running) {
      stopDev(workspaceRoot, clientStatus.pid)
      devPhase = 'stopped'
      memHistory.length = 0
      clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
      renderAll()
      setStatus('Dev server stopped')
      return
    }

    devPhase = 'starting'
    startSpinner('Starting dev server…')
    renderAll()
    startDev(workspaceRoot)
    clientStatus = await waitForDev(workspaceRoot, settings.devPort)
    stopSpinner()
    devPhase = clientStatus.http.up ? 'running' : 'stopped'
    renderAll()
    setStatus(
      clientStatus.http.up
        ? `Dev server up on port ${settings.devPort}`
        : `Dev not responding — check ${devLogPath(workspaceRoot)}`,
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
      setStatus(`Catalog: ${catalog.length} packages`, 'ok')
    } catch (err) {
      stopSpinner()
      setStatus(`Catalog error: ${err.message}`, 'error')
    }
  }

  screen.key(['escape', 'q', 'C-c'], () => {
    if (settingsOpen) {
      closeSettings()
      return
    }
    process.exit(0)
  })

  screen.key(['tab'], () => {
    if (settingsOpen) return
    if (focusPanel === 'catalog') focusTheme()
    else focusCatalog()
  })
  screen.key(['S-tab'], () => {
    if (!settingsOpen) focusCatalog()
  })

  screen.key(['d', 'D'], () => {
    if (!settingsOpen) toggleInstallMode()
  })
  screen.key(['n', 'N'], () => {
    if (!settingsOpen) toggleDev()
  })
  screen.key(['g'], () => {
    if (!settingsOpen) openSettings()
  })
  screen.key(['b'], () => {
    if (!settingsOpen) {
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
  screen.key(['s'], () => {
    if (!settingsOpen) applyChanges()
  })
  screen.key(['r'], () => {
    if (!settingsOpen) refreshCatalog()
  })

  screen.key(['1'], () => {
    if (settingsOpen) return
    activeTab = 'app'
    focusCatalog()
    renderAll()
  })
  screen.key(['2'], () => {
    if (settingsOpen) return
    activeTab = 'module'
    focusCatalog()
    renderAll()
  })
  screen.key(['3', 't'], () => {
    if (settingsOpen) return
    focusTheme()
    renderAll()
  })

  githubInput.key(['enter'], () => saveSettingsFromOverlay())
  githubInput.key(['escape'], () => closeSettings())

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

  if (!isWorkspaceInstallMode(settings)) {
    setStatus(
      'USER mode (npm). Press [d] for DEV install (clone sources) · [g] GitHub user for forks',
      'info',
    )
  } else if (!settings.githubUser) {
    setStatus('DEV mode — press [g] to set GitHub username for fork clones', 'ok')
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
