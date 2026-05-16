import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import blessed from 'neo-blessed'
import {
  findWorkspaceRoot,
  loadSettings,
  desktopPaths,
  KINDS,
  SCOPE,
  shortName,
} from './lib/workspace.js'
import { readDesktopConfig, writeDesktopConfig, readDesktopDependencies } from './lib/config.js'
import {
  loadCatalog,
  filterCatalog,
  mergeInstalled,
  readThemeMeta,
} from './lib/catalog.js'
import { getClientStatus, startDev, stopDev, runScript } from './lib/status.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const desktopBin = join(__dirname, 'desktop.js')

const COLORS = {
  border: 'cyan',
  label: 'white',
  accent: 'green',
  warn: 'yellow',
  err: 'red',
  muted: 'gray',
  fg: 'white',
  bg: 'black',
}

/** @param {string} commandName */
export async function runTui(commandName = 'desktop') {
  const workspaceRoot = findWorkspaceRoot()
  if (!workspaceRoot) {
    console.error('Not inside an OWD workspace.')
    process.exit(1)
  }

  const paths = desktopPaths(workspaceRoot)
  const settings = loadSettings(workspaceRoot)
  let config = readDesktopConfig(paths.config, workspaceRoot)
  let deps = readDesktopDependencies(paths.packageJson)

  let catalog = []
  let activeTab = 'module'
  let listIndex = 0
  let pendingTheme = config.theme
  /** @type {Map<string, boolean>} */
  const pendingPackages = new Map()
  let statusMessage = ''
  let clientStatus = await getClientStatus(settings.devPort)
  let themeMeta = readThemeMeta(workspaceRoot, pendingTheme ?? config.theme ?? '')

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    title: 'OWD Desktop',
    cursor: { artificial: true, shape: 'line', blink: true },
  })

  screen.key(['escape', 'q', 'C-c'], () => process.exit(0))

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 9,
    tags: true,
    border: { type: 'line', fg: COLORS.border },
    style: { fg: COLORS.fg, bg: COLORS.bg, border: { fg: COLORS.border } },
    label: ' Client ',
  })

  const themePanel = blessed.box({
    parent: screen,
    top: 9,
    left: 0,
    width: '38%',
    height: '62%',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    mouse: true,
    border: { type: 'line', fg: COLORS.border },
    style: {
      fg: COLORS.fg,
      bg: COLORS.bg,
      border: { fg: COLORS.border },
      focus: { border: { fg: COLORS.accent } },
    },
    label: ' Active theme ',
  })

  const catalogPanel = blessed.box({
    parent: screen,
    top: 9,
    left: '38%',
    width: '62%',
    height: '62%',
    tags: true,
    border: { type: 'line', fg: COLORS.border },
    style: {
      fg: COLORS.fg,
      bg: COLORS.bg,
      border: { fg: COLORS.border },
      focus: { border: { fg: COLORS.accent } },
    },
    label: ' Packages ',
  })

  const list = blessed.list({
    parent: catalogPanel,
    top: 1,
    left: 1,
    width: '100%-2',
    height: '100%-2',
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    invert: true,
    style: {
      fg: COLORS.fg,
      bg: COLORS.bg,
      item: { fg: COLORS.fg },
      selected: { bg: 'blue', fg: 'white', bold: true },
    },
  })

  const metrics = blessed.box({
    parent: screen,
    top: '71%',
    left: 0,
    width: '100%',
    height: 5,
    tags: true,
    border: { type: 'line', fg: COLORS.border },
    style: { fg: COLORS.fg, bg: COLORS.bg, border: { fg: COLORS.border } },
    label: ' Performance ',
  })

  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    tags: true,
    content: '',
    style: { fg: COLORS.muted, bg: COLORS.bg },
  })

  function setStatus(msg, isError = false) {
    statusMessage = msg
    footer.setContent(
      `{${isError ? COLORS.err : COLORS.warn}-fg}${msg}{/}  ` +
        `{${COLORS.muted}-fg}|  [1] Apps  [2] Modules  [3] Themes  [↑↓] move  [Space] toggle  [s] save  [r] refresh  [d] dev  [g] generate  [q] quit{/}`,
    )
    screen.render()
  }

  function getDesiredPackages(kind) {
    const items = filterCatalog(catalog, kind)
  return items
      .filter((item) => {
        const pending = pendingPackages.get(item.name)
        if (pending !== undefined) return pending
        return item.installed
      })
      .map((item) => item.name)
  }

  function renderHeader() {
    const dot = clientStatus.running
      ? `{${COLORS.accent}-fg}●{/}`
      : `{${COLORS.err}-fg}○{/}`
    const state = clientStatus.running ? 'running' : 'stopped'
    const url = clientStatus.http.up
      ? `{${COLORS.accent}-fg}${clientStatus.http.url}{/}`
      : `{${COLORS.muted}-fg}http://127.0.0.1:${settings.devPort}{/}`

    header.setContent(
      [
        `  ${dot}  Nuxt dev server is ${state}`,
        clientStatus.pid
          ? `  PID ${clientStatus.pid}   RSS ${clientStatus.stats.memMb} MiB   threads ${clientStatus.stats.threads}`
          : '  {gray-fg}No dev process — press [d] to start{/}',
        `  ${url}`,
        '',
        `  {bold}Shortcuts{/}  [d] dev toggle   [g] generate   [p] preview   [b] build (nx)   [s] save packages`,
        `  {gray-fg}Workspace{/}  ${workspaceRoot}`,
        `  {gray-fg}Fork user{/}  ${settings.githubUser ?? '—'}  (set OWD_GITHUB_USER or .owd/settings.json)`,
      ].join('\n'),
    )
  }

  function renderTheme() {
    const short = (pendingTheme ?? config.theme ?? '').replace('@owdproject/', '')
    themeMeta = readThemeMeta(workspaceRoot, pendingTheme ?? config.theme ?? '')

    const lines = [
      `{bold}{${COLORS.accent}-fg}${short || '—'}{/}{/}`,
      themeMeta.version ? `  v${themeMeta.version}` : '',
      '',
      themeMeta.description,
      '',
      `{${COLORS.muted}-fg}Author{/}  ${themeMeta.author}`,
      `{${COLORS.muted}-fg}License{/} ${themeMeta.license}`,
      '',
      `{${COLORS.muted}-fg}Remote{/}`,
      themeMeta.remote ? `  ${themeMeta.remote}` : '  {gray-fg}(npm or not cloned){/}',
      '',
      `{${COLORS.muted}-fg}Credits{/}`,
      '  Open Web Desktop · https://owdproject.org',
      settings.githubUser
        ? `  Fork catalog: github.com/${settings.githubUser}`
        : '',
      '',
      activeTab === 'theme'
        ? `{${COLORS.warn}-fg}Themes tab: Enter sets active theme{/}`
        : `{gray-fg}Switch to [3] Themes to change{/}',
    ]
    themePanel.setContent(lines.filter(Boolean).join('\n'))
  }

  function listItems() {
    const items = mergeInstalled(filterCatalog(catalog, activeTab), config, deps)
    return items.map((item, i) => {
      const pending = pendingPackages.get(item.name)
      const on = pending !== undefined ? pending : item.installed
      const mark = on ? `{${COLORS.accent}-fg}✓{/}` : ' '
      const star =
        item.stars > 0 ? `{${COLORS.muted}-fg}${item.stars}★{/} ` : ''
      const src =
        item.org === 'workspace'
          ? `{${COLORS.accent}-fg}local{/}`
          : `{${COLORS.muted}-fg}${item.org}{/}`
      const active =
        item.activeTheme && activeTab === 'theme'
          ? ` {${COLORS.warn}-fg}◉ active{/}`
          : ''
      const sel = i === listIndex ? '›' : ' '
      const desc = (item.description ?? '').slice(0, 36)
      return `${sel} [${mark}] ${star}{bold}${item.shortName}{/} ${src}${active}  ${desc}`
    })
  }

  function renderList() {
    const label = KINDS[activeTab].label
    const items = listItems()
    catalogPanel.setLabel(` ${label} `)
    list.setItems(items.length ? items : ['{gray-fg}Loading catalog…{/}'])
    if (listIndex >= items.length) listIndex = Math.max(0, items.length - 1)
    list.select(listIndex)
    renderTheme()
    screen.render()
  }

  function renderMetrics() {
    const pendingCount = [...pendingPackages.entries()].filter(([, v]) => v).length
    metrics.setContent(
      [
        `  Dev ${clientStatus.running ? 'up' : 'down'}   HTTP ${clientStatus.http.status || '—'}   Port ${settings.devPort}`,
        `  Memory (dev PID) ${clientStatus.stats.memMb} MiB   Pending changes: ${pendingPackages.size} toggles`,
        `  Active theme ${(pendingTheme ?? config.theme ?? '').replace('@owdproject/', '')}`,
        `  Catalog: ${catalog.length} packages · tab ${KINDS[activeTab].label}`,
      ].join('\n'),
    )
  }

  function renderAll() {
    renderHeader()
    renderList()
    renderMetrics()
    if (!statusMessage) setStatus('Ready')
    else footer.setContent(statusMessage)
    screen.render()
  }

  async function refreshCatalog() {
    setStatus('Fetching catalog from GitHub…')
    try {
      catalog = await loadCatalog(workspaceRoot, settings)
      config = readDesktopConfig(paths.config, workspaceRoot)
      deps = readDesktopDependencies(paths.packageJson)
      renderAll()
      setStatus(`Catalog loaded (${catalog.length} packages)`)
    } catch (err) {
      setStatus(`Catalog: ${err.message}`, true)
    }
  }

  function currentListEntries() {
    return mergeInstalled(filterCatalog(catalog, activeTab), config, deps)
  }

  function toggleCurrent() {
    const entries = currentListEntries()
    const item = entries[listIndex]
    if (!item) return

    if (activeTab === 'theme') {
      pendingTheme = item.name
      pendingPackages.set(item.name, true)
      for (const other of entries) {
        if (other.name !== item.name) pendingPackages.set(other.name, false)
      }
      setStatus(`Theme → ${item.shortName} (press [s] to apply)`)
    } else {
      const pending = pendingPackages.get(item.name)
      const next = pending !== undefined ? !pending : !item.installed
      pendingPackages.set(item.name, next)
      setStatus(`${next ? 'Install' : 'Remove'} ${item.shortName} on save`)
    }
    renderList()
    renderMetrics()
  }

  async function applyChanges() {
    setStatus('Applying changes…')
    screen.render()

    const nextApps = getDesiredPackages('app')
    const nextModules = getDesiredPackages('module')
    const nextTheme = pendingTheme ?? config.theme

    const prevApps = new Set(config.apps ?? [])
    const prevModules = new Set(config.modules ?? [])

    try {
      for (const pkg of nextApps) {
        if (!prevApps.has(pkg)) {
          execSync(`node ${JSON.stringify(desktopBin)} add ${shortName(pkg)}`, {
            cwd: workspaceRoot,
            stdio: 'inherit',
          })
        }
      }
      for (const pkg of nextModules) {
        if (!prevModules.has(pkg)) {
          execSync(`node ${JSON.stringify(desktopBin)} add ${shortName(pkg)}`, {
            cwd: workspaceRoot,
            stdio: 'inherit',
          })
        }
      }

      if (nextTheme && nextTheme !== config.theme) {
        execSync(`node ${JSON.stringify(desktopBin)} add ${shortName(nextTheme)}`, {
          cwd: workspaceRoot,
          stdio: 'inherit',
        })
      }

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
      setStatus('Saved ✓')
      renderAll()
    } catch (err) {
      setStatus(`Save failed: ${err.message}`, true)
    }
  }

  list.on('select', () => toggleCurrent())

  screen.key(['1'], () => {
    activeTab = 'app'
    listIndex = 0
    renderList()
    setStatus('Apps')
  })
  screen.key(['2'], () => {
    activeTab = 'module'
    listIndex = 0
    renderList()
    setStatus('Modules')
  })
  screen.key(['3'], () => {
    activeTab = 'theme'
    listIndex = 0
    renderList()
    setStatus('Themes')
  })

  screen.key(['up', 'k'], () => {
    listIndex = Math.max(0, listIndex - 1)
    list.up(1)
    renderMetrics()
  })
  screen.key(['down', 'j'], () => {
    const max = currentListEntries().length - 1
    listIndex = Math.min(max, listIndex + 1)
    list.down(1)
    renderMetrics()
  })

  screen.key(['space'], () => toggleCurrent())
  screen.key(['s', 'S'], () => applyChanges())
  screen.key(['r', 'R'], () => refreshCatalog())

  screen.key(['d', 'D'], async () => {
    if (clientStatus.running && clientStatus.pid) {
      stopDev(clientStatus.pid)
      setStatus('Stopped dev server')
    } else {
      startDev(workspaceRoot)
      setStatus('Starting dev server…')
    }
    setTimeout(async () => {
      clientStatus = await getClientStatus(settings.devPort)
      renderAll()
    }, 1500)
  })

  screen.key(['g', 'G'], () => {
    setStatus('Running generate…')
    runScript(workspaceRoot, 'generate')
  })

  screen.key(['p', 'P'], () => {
    setStatus('Running preview…')
    runScript(paths.desktop, 'preview')
  })

  screen.key(['b', 'B'], () => {
    setStatus('Running build…')
    runScript(workspaceRoot, 'generate')
  })

  list.focus()
  await refreshCatalog()
  clientStatus = await getClientStatus(settings.devPort)
  renderAll()

  setInterval(async () => {
    clientStatus = await getClientStatus(settings.devPort)
    renderHeader()
    renderMetrics()
    screen.render()
  }, 2000)
}
