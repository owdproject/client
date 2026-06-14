import { execSync } from 'node:child_process'
import { watch, existsSync, statSync, openSync, readSync, closeSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
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
  isDesktopKitPackage,
  inferKind,
  normalizeCatalogSort,
  hasDocsModuleInstalled,
  docsBasePathFromConfig,
  getPackagesRequiredByTheme as getPackagesRequiredByThemeImport,
} from './lib/workspace.js'
import {
  executeInstallPlan as extExecuteInstallPlan,
  runStartupInstallFlow as extRunStartupInstallFlow,
} from './lib/installWizardFlow.js'
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
  resolveInstallPlan,
  cloneRepo,
  spawnAsync,
} from './lib/install.js'
import {
  resolvePackageSources,
  buildSourceOptions,
  detectGithubSshAuth,
  getCachedSshAuth,
  trustedPublishers,
  githubCloneUrl,
} from './lib/packageSources.js'
import {
  formatCatalogRowPlain,
  formatLegendLine,
  formatDetailPanel,
  formatHeaderLine,
  getColumnWidths,
} from './lib/cpFormat.js'
import {
  radarSpinner,
  progressTrack,
  statusPrefix,
  spinnerFrameCount,
} from './lib/cpAscii.js'
import {
  getClientStatus,
  startDev,
  stopDev,
  waitForDev,
  waitForDevStop,
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

function truncateFormatted(str, maxLen) {
  let result = ''
  let visibleCount = 0
  let i = 0
  let truncated = false
  while (i < str.length) {
    if (str[i] === '{') {
      const closeIdx = str.indexOf('}', i)
      if (closeIdx !== -1) {
        result += str.slice(i, closeIdx + 1)
        i = closeIdx + 1
        continue
      }
    }
    if (visibleCount >= maxLen) {
      truncated = true
      break
    }
    result += str[i]
    visibleCount++
    i++
  }
  if (truncated) {
    result += '...{/}'
  }
  return result
}

/** @param {string} commandName */
export async function runCp(commandName = 'desktop') {
  const workspaceRoot = findWorkspaceRoot()
  if (!workspaceRoot) {
    console.error('Not inside an OWD workspace.')
    process.exit(1)
  }

  let paths = desktopPaths(workspaceRoot)
  const devTarget = resolveDevTarget(process.cwd(), workspaceRoot)
  const playgroundActive = devTarget?.mode === 'playground'
  const playgroundLabel = devTarget?.packageName ?? null
  warnLegacyDesktopConfig(
    paths.configLegacy ? { legacy: true, file: 'owd.config.ts' } : null,
  )
  let settings = loadSettings(workspaceRoot)
  let configError = null
  let config = null
  try {
    config = readDesktopConfig(paths.config, workspaceRoot)
  } catch (err) {
    configError = err.message
    config = { apps: [], modules: [], theme: null }
  }
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

  function getMissingGitWarnings(root) {
    const warnings = []
    const checkDirs = ['apps', 'themes', 'packages']

    for (const dirName of checkDirs) {
      const fullDir = join(root, dirName)
      if (!existsSync(fullDir)) continue

      try {
        const subdirs = readdirSync(fullDir, { withFileTypes: true })
        for (const subdir of subdirs) {
          if (!subdir.isDirectory()) continue
          const name = subdir.name
          if (name.startsWith('.')) continue

          // Exclude exclusions
          if (dirName === 'packages') {
            if (name.startsWith('core') || name.startsWith('nx') || name.startsWith('kit-')) {
              continue
            }
          }

          const gitPath = join(fullDir, name, '.git')
          if (!existsSync(gitPath)) {
            warnings.push(subdir.name)
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return warnings
  }

  function getWorkspaceGitChanges(root) {
    // Returns { added, modified, deleted } summed across the main repo
    // and all sub-repos in apps/, packages/, themes/ that have a .git folder.
    const sumChanges = (dir) => {
      let added = 0, modified = 0, deleted = 0
      try {
        const porcelain = execSync('git status --porcelain', {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()
        if (!porcelain) return { added: 0, modified: 0, deleted: 0 }
        for (const line of porcelain.split('\n').filter(Boolean)) {
          if (line.startsWith('??')) { added++; continue }
          const xy = line.slice(0, 2)
          if (xy.includes('A')) added++
          else if (xy.includes('D')) deleted++
          else modified++
        }
      } catch { /* no git or not a repo */ }
      return { added, modified, deleted }
    }

    let totalAdded = 0, totalModified = 0, totalDeleted = 0
    let appsRepos = 0
    let modulesRepos = 0
    let themesRepos = 0

    // Main workspace repo
    const main = sumChanges(root)
    totalAdded += main.added
    totalModified += main.modified
    totalDeleted += main.deleted
    const mainRepo = (main.added > 0 || main.modified > 0 || main.deleted > 0) ? 1 : 0

    // Sub-repos
    const checkDirs = ['apps', 'themes', 'packages']
    for (const dirName of checkDirs) {
      const fullDir = join(root, dirName)
      if (!existsSync(fullDir)) continue
      try {
        const subdirs = readdirSync(fullDir, { withFileTypes: true })
        for (const subdir of subdirs) {
          if (!subdir.isDirectory()) continue
          const name = subdir.name
          if (name.startsWith('.')) continue
          if (dirName === 'packages') {
            if (name.startsWith('core') || name.startsWith('nx') || name.startsWith('kit-')) continue
          }
          const subGit = join(fullDir, name, '.git')
          if (!existsSync(subGit)) continue
          const sub = sumChanges(join(fullDir, name))
          if (sub.added > 0 || sub.modified > 0 || sub.deleted > 0) {
            if (dirName === 'apps') appsRepos++
            else if (dirName === 'packages') modulesRepos++
            else if (dirName === 'themes') themesRepos++
          }
          totalAdded += sub.added
          totalModified += sub.modified
          totalDeleted += sub.deleted
        }
      } catch { /* ignore */ }
    }

    return {
      added: totalAdded,
      modified: totalModified,
      deleted: totalDeleted,
      mainRepo,
      appsRepos,
      modulesRepos,
      themesRepos,
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
  let ignoreNextConfigWatch = false
  let isInstalling = false
  let hasInstallError = false
  let isStartingServer = false
  let configWatcher = null
  let configWatchTimeout = null
  let logWatcher = null

  const packageUpdates = new Map()
  const localGitChanges = new Map()
  let checkingUpdates = false

  let catalog = []
  let catalogCacheAge = ''
  let activeTab = 'app'
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
  let installWizardResolve = null
  let installWizardIsStartup = false
  /** @type {string[]} */
  let installWizardQueue = []
  let installWizardIndex = 0
  /** @type {import('./lib/packageSources.js').SourceOption[]} */
  let installWizardOptions = []
  let installWizardUntrusted = false
  let installWizardConfirmUntrusted = false
  let installWizardAutoExecute = true
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
    { id: 'check-updates', label: 'Check GitHub/NPM updates', key: 'u' },
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
  const CLIENT_PANEL_H = 9
  const PANELS_TOP = MAIN_TOP + CLIENT_PANEL_H

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
    style: panelStyle(C.border),
    label: ' Metrics ',
  })

  const catalogBox = blessed.box({
    parent: screen,
    top: PANELS_TOP,
    left: 0,
    width: '100%',
    bottom: 5,
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
    bottom: 5,
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
    mouse: true,
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

    const showLogs = (isDevServerUp() || isInstalling || hasInstallError) && cols >= 120

    if (showLogs) {
      logsBox.show()

      clientBox.position.width = '40%-1'

      metricsBox.position.left = '40%'
      metricsBox.position.width = '28%-1'

      catalogBox.position.width = '68%-1'

      logsBox.position.left = '68%'
      logsBox.position.width = '32%'
      logsBox.position.top = MAIN_TOP
      logsBox.position.height = rows - MAIN_TOP - 5
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
    catalogBox.position.height = rows - PANELS_TOP - 5

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
    height: 5,
    tags: true,
    border: { type: 'line' },
    label: ' Status & Shortcuts ',
    style: panelStyle(C.borderDim, C.muted),
  })

  const settingsOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 70,
    height: 13,
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

  const trustedOrgsInput = blessed.textbox({
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
    label: ' Trusted orgs (comma-separated) ',
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

  const installProgressOverlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 60,
    height: 8,
    hidden: true,
    tags: true,
    border: { type: 'line' },
    label: cardLabel(' Syncing Workspace '),
    style: panelStyle(C.accent),
  })

  const installProgressContent = blessed.box({
    parent: installProgressOverlay,
    top: 1,
    left: 2,
    width: '100%-4',
    height: 4,
    tags: true,
  })

  const ctx = {
    getConfig: () => config,
    setConfig: (val) => { config = val },
    getDeps: () => deps,
    setDeps: (val) => { deps = val },
    getPaths: () => paths,
    setPaths: (val) => { paths = val },
    getSettings: () => settings,
    setSettings: (val) => { settings = val },
    getWorkspaceRoot: () => workspaceRoot,
    getCatalog: () => catalog,
    getPendingTheme: () => pendingTheme,
    setPendingTheme: (val) => { pendingTheme = val },
    getPendingPackages: () => pendingPackages,
    getInstallChoices: () => installChoices,
    isInstalling: () => isInstalling,
    setInstalling: (val) => {
      isInstalling = val
      if (val) {
        hasInstallError = false
        startLogWatcher()
      } else if (!isDevServerUp() && !hasInstallError) {
        stopLogWatcher()
      }
      layoutCatalogPanel()
    },
    isWritingConfig: () => isWritingConfig,
    setWritingConfig: (val) => { isWritingConfig = val },
    getIgnoreNextConfigWatch: () => ignoreNextConfigWatch,
    setIgnoreNextConfigWatch: (val) => { ignoreNextConfigWatch = val },
    isDevServerUp: () => isDevServerUp(),
    rebootDevServer: () => rebootDevServer(),
    clearLogs: () => clearLogsBox(),
    getConfigError: () => configError,
    setConfigError: (val) => { configError = val },
    getConfigRestartHintUntil: () => configRestartHintUntil,
    setConfigRestartHintUntil: (val) => { configRestartHintUntil = val },
    getConfigRestartHintTimer: () => configRestartHintTimer,
    setConfigRestartHintTimer: (val) => { configRestartHintTimer = val },
    getSaveProgress: () => saveProgress,
    setSaveProgress: (val) => { saveProgress = val },
    getSpinnerFrame: () => spinnerFrame,
    setSpinnerFrame: (val) => { spinnerFrame = val },
    collectInstallPlan: () => collectInstallPlan(),
    startInstallWizard: (packagesToInstall, isStartup = false, opts = {}) => startInstallWizard(packagesToInstall, isStartup, opts),
    showCustomConfirm: (opts) => showCustomConfirm(opts),
    setStatus: (msg, tone) => setStatus(msg, tone),
    startSpinner: (msg) => startSpinner(msg),
    stopSpinner: () => stopSpinner(),
    renderAll: () => renderAll(),
    renderClient: () => renderClient(),
    renderHelp: () => renderHelp(),
    updateCatalogKeysState: () => updateCatalogKeysState(),
    installProgressOverlay,
    installProgressContent,
    screen,
  }


  // Custom update selection dialog in the style of the install wizard
  function showUpdateSelectionDialog({ title, updates }) {
    return new Promise((resolve) => {
      confirmDialogOpen = true
      updateCatalogKeysState()

      const innerHeight = Math.max(12, 8 + updates.length)

      const dialogBox = blessed.box({
        parent: screen,
        border: 'line',
        height: innerHeight,
        width: 68,
        top: 'center',
        left: 'center',
        label: cardLabel(` ${title} `),
        style: panelStyle(C.accent),
        tags: true,
        keys: true,
      })

      const headerBox = blessed.box({
        parent: dialogBox,
        top: 1,
        left: 2,
        width: '100%-4',
        height: updates.length + 2,
        tags: true,
        style: flatStyle(C.muted),
      })

      const updatesText = updates.map(([name, info]) => {
        if (info.latestVersion) {
          return ` • {bold}${name}{/} (${info.localVersion} -> {green-fg}${info.latestVersion}{/}) {${C.npm}-fg}[NPM]{/}`
        } else {
          const suffix = info.behindCount > 0 ? ` (${info.behindCount} commit${info.behindCount > 1 ? 's' : ''} behind)` : ''
          return ` • {bold}${name}{/}${suffix} {${C.git}-fg}[GIT]{/}`
        }
      }).join('\n')

      headerBox.setContent(
        `{bold}Updates are available for packages:{/}\n` +
        updatesText
      )

      const choiceList = blessed.list({
        parent: dialogBox,
        top: updates.length + 3,
        left: 2,
        width: '100%-4',
        height: 3,
        tags: true,
        keys: true,
        vi: true,
        mouse: true,
        scrollbar: LIST_SCROLLBAR,
        style: LIST_STYLE,
        items: [
          ` {${C.accent}-fg}▶{/} Run Update Wizard `,
          ` {${C.muted}-fg}▷{/} Skip updates `,
        ]
      })

      blessed.box({
        parent: dialogBox,
        bottom: 1,
        left: 2,
        width: '100%-4',
        height: 1,
        tags: true,
        style: flatStyle(C.muted),
        content: `{${C.muted}-fg}Enter select · Esc cancel{/}`
      })

      function close(value) {
        confirmDialogOpen = false
        updateCatalogKeysState()
        dialogBox.destroy()
        focusCatalog()
        screen.render()
        resolve(value)
      }

      choiceList.on('select', () => {
        close(choiceList.selected === 0)
      })

      dialogBox.key(['escape', 'q'], () => {
        close(false)
      })

      choiceList.key(['escape', 'q'], () => {
        close(false)
      })

      choiceList.select(0)
      dialogBox.setFront()
      choiceList.focus()
      screen.render()
    })
  }


  // Custom reusable navigable confirm dialog (with arrow key navigation, mouse support, and vertical stacking)
  function showCustomConfirm({ title, message, yesText, noText, cancelText, height = 11, width = 'half' }) {
    return new Promise((resolve) => {
      confirmDialogOpen = true
      updateCatalogKeysState()

      const dialogBox = blessed.box({
        parent: screen,
        border: 'line',
        height: height,
        width: width,
        top: 'center',
        left: 'center',
        label: cardLabel(` ${title} `),
        style: panelStyle(C.accent),
        tags: true,
        keys: true,
      })

      const hasCancel = !!cancelText
      const bottomOffset = hasCancel ? 7 : 5

      const msgBox = blessed.box({
        parent: dialogBox,
        top: 1,
        left: 2,
        right: 2,
        bottom: bottomOffset,
        content: message,
        tags: true,
      })

      const yesBtn = blessed.box({
        parent: dialogBox,
        bottom: hasCancel ? 5 : 3,
        left: 2,
        right: 2,
        height: 1,
        content: yesText,
        align: 'center',
        valign: 'middle',
        clickable: true,
        style: {
          bg: '#21262d',
          fg: '#2ea44f',
          bold: true,
        }
      })

      const noBtn = blessed.box({
        parent: dialogBox,
        bottom: hasCancel ? 3 : 1,
        left: 2,
        right: 2,
        height: 1,
        content: noText,
        align: 'center',
        valign: 'middle',
        clickable: true,
        style: {
          bg: '#21262d',
          fg: '#cb2431',
          bold: true,
        }
      })

      let cancelBtn = null
      if (hasCancel) {
        cancelBtn = blessed.box({
          parent: dialogBox,
          bottom: 1,
          left: 2,
          right: 2,
          height: 1,
          content: cancelText,
          align: 'center',
          valign: 'middle',
          clickable: true,
          style: {
            bg: '#21262d',
            fg: '#8b949e',
            bold: true,
          }
        })
      }

      let selectedIndex = 0
      const maxIndex = hasCancel ? 2 : 1

      function updateSelection() {
        yesBtn.style.bg = '#21262d'
        yesBtn.style.fg = '#2ea44f'
        noBtn.style.bg = '#21262d'
        noBtn.style.fg = '#cb2431'
        if (cancelBtn) {
          cancelBtn.style.bg = '#21262d'
          cancelBtn.style.fg = '#8b949e'
        }

        if (selectedIndex === 0) {
          yesBtn.style.bg = '#2ea44f'
          yesBtn.style.fg = 'white'
        } else if (selectedIndex === 1) {
          noBtn.style.bg = '#cb2431'
          noBtn.style.fg = 'white'
        } else if (selectedIndex === 2 && cancelBtn) {
          cancelBtn.style.bg = '#8b949e'
          cancelBtn.style.fg = 'black'
        }
        screen.render()
      }

      function cleanup() {
        screen.removeListener('keypress', keyHandler)
        dialogBox.destroy()
        confirmDialogOpen = false
        updateCatalogKeysState()
        screen.render()
      }

      const keyHandler = (ch, key) => {
        if (!key) return
        if (key.name === 'up' || key.name === 'left') {
          selectedIndex = (selectedIndex - 1 + (maxIndex + 1)) % (maxIndex + 1)
          updateSelection()
        } else if (key.name === 'down' || key.name === 'right' || key.name === 'tab') {
          selectedIndex = (selectedIndex + 1) % (maxIndex + 1)
          updateSelection()
        } else if (key.name === 'enter') {
          cleanup()
          if (selectedIndex === 0) resolve(true)
          else if (selectedIndex === 1) resolve(false)
          else resolve(null)
        } else if (key.name === 'escape') {
          cleanup()
          resolve(null)
        }
      }

      screen.on('keypress', keyHandler)

      yesBtn.on('click', () => {
        cleanup()
        resolve(true)
      })

      noBtn.on('click', () => {
        cleanup()
        resolve(false)
      })

      if (cancelBtn) {
        cancelBtn.on('click', () => {
          cleanup()
          resolve(null)
        })
        cancelBtn.on('mouseover', () => {
          selectedIndex = 2
          updateSelection()
        })
      }

      yesBtn.on('mouseover', () => {
        selectedIndex = 0
        updateSelection()
      })

      noBtn.on('mouseover', () => {
        selectedIndex = 1
        updateSelection()
      })

      dialogBox.setFront()
      dialogBox.focus()
      updateSelection()
    })
  }

  function overlayBlocksKeys() {
    return settingsOpen || menuOpen || installWizardOpen || sortPickerOpen || confirmDialogOpen || isInstalling || isStartingServer
  }

  function updateCatalogKeysState() {
    const blocked = overlayBlocksKeys()
    catalogList.keys = !blocked
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
    updateCatalogKeysState()
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
    updateCatalogKeysState()
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
    return `${keyHint('d')} start/stop  ${keyHint('m')} menu`
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

    const msgLine = `  {bold}{${statusColor}-fg}${msg}{/}{/}`

    const queue = pendingQueueSummary()
    const saveShortcut = queue
      ? `{${C.accent}-fg}${keyHint('s')} save (${queue}){/}`
      : `${keyHint('s')} save`

    helpBar.setContent(
      [
        msgLine,
        `  Legend: {${C.add}-fg}[+]{/} add  {${C.remove}-fg}[-]{/} remove  {${C.accent}-fg}[*]{/} on desktop  |  {${C.npm}-fg}NPM{/} registry  {${C.git}-fg}GIT{/} repo  {${C.local}-fg}LOC{/} workspace  |  {${C.warn}-fg}WRN{/} untrusted`,
        `  Shortcuts: ↑↓ Space toggle  ${keyHint('1')}${keyHint('2')}${keyHint('3')} tabs  ${saveShortcut}  ${keyHint('d')} server  ${keyHint('O')} sort  ${keyHint('m')} menu  ${keyHint('u')} updates  ${keyHint('r')} refresh  ${keyHint('q')} quit`,
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
    configWatchTimeout = setTimeout(async () => {
      try {
        const newConfig = readDesktopConfig(paths.config, workspaceRoot)
        configError = null
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
          await syncDependenciesWithConfig()
        } else {
          renderAll()
        }
      } catch (err) {
        configError = err.message
        renderAll()
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
          if (ignoreNextConfigWatch) {
            ignoreNextConfigWatch = false
            return
          }
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
      logsBox.setContent('')
      screen.render()
      return
    }
    try {
      const stats = statSync(logFile)
      const streamSize = Math.min(stats.size, 10000)
      if (streamSize === 0) {
        logsBox.setContent('')
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
    logsBox.setContent('{gray-fg}Waiting for logs...{/}')
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

  function startSpinner(message, showProgressOverlay = false) {
    stopSpinner()
    spinnerFrame = 0
    setStatus(message)
    spinnerTimer = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % spinnerFrameCount
      statusLine = `${radarSpinner(spinnerFrame)} ${message}`
      renderHelp('info')

      if (showProgressOverlay && saveProgress) {
        const bar = `[${progressTrack(saveProgress.step, saveProgress.total, 0, 36)}]`
        const spin = radarSpinner(spinnerFrame)
        installProgressContent.setContent(
          [
            `  {bold}${spin} ${saveProgress.label}{/}`,
            '',
            `  {cyan-fg}${bar}{/}`,
            `  Step ${saveProgress.step} of ${saveProgress.total}`,
          ].join('\n')
        )
      }

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
        sshAuthStatus?.githubLogin
          ? `{${C.muted}-fg}GitHub username '${sshAuthStatus.githubLogin}' detected via SSH and used for fork clones.{/}`
          : `{${C.muted}-fg}Configure SSH or environment variable OWD_GITHUB_USER to enable fork clones.{/}`,
        `{${C.muted}-fg}Enter save · t test SSH · Esc cancel{/}`,
      ].join('\n'),
    )
  }

  async function testSshFromSettings() {
    setStatus('Testing SSH to GitHub…')
    screen.render()
    sshAuthStatus = await detectGithubSshAuth(workspaceRoot, { force: true })
    if (sshAuthStatus.available && sshAuthStatus.githubLogin) {
      settings.githubUser = sshAuthStatus.githubLogin
    }
    renderSettingsPanel()
    setStatus(sshAuthStatus.message ?? 'SSH test complete', sshAuthStatus.available ? 'ok' : 'error')
    screen.render()
  }

  function openSettings() {
    settingsOpen = true
    updateCatalogKeysState()
    settingsOverlay.show()
    renderSettingsPanel()
    trustedOrgsInput.setValue((settings.githubOrgs ?? ['owdproject']).join(', '))
    trustedOrgsInput.focus()
    setStatus('Settings — Enter save · t test SSH · Esc cancel')
    screen.render()
  }

  function closeSettings() {
    settingsOpen = false
    updateCatalogKeysState()
    settingsOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function openMenu() {
    if (settingsOpen || installWizardOpen || sortPickerOpen) return

    menuOpen = true
    updateCatalogKeysState()
    menuOverlay.show()
    menuList.focus()
    setStatus('Menu — ↑↓ select · Enter run · Esc close')
    screen.render()
  }

  function closeMenu() {
    menuOpen = false
    updateCatalogKeysState()
    menuOverlay.hide()
    focusCatalog()
    screen.render()
  }

  function getLocalGitChanges(dir) {
    try {
      const porcelain = execSync('git status --porcelain', {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      if (!porcelain) return null

      let added = 0, modified = 0, deleted = 0
      for (const line of porcelain.split('\n').filter(Boolean)) {
        if (line.startsWith('??')) { added++; continue }
        const xy = line.slice(0, 2)
        if (xy.includes('A')) added++
        else if (xy.includes('D')) deleted++
        else modified++
      }
      return { added, modified, deleted }
    } catch {
      return null
    }
  }

  function updateLocalChanges() {
    const checkDirs = ['apps', 'themes', 'packages']
    for (const dirName of checkDirs) {
      const fullDir = join(workspaceRoot, dirName)
      if (!existsSync(fullDir)) continue
      try {
        const subdirs = readdirSync(fullDir, { withFileTypes: true })
        for (const subdir of subdirs) {
          if (!subdir.isDirectory()) continue
          const name = subdir.name
          if (name.startsWith('.')) continue
          const subGit = join(fullDir, name, '.git')
          if (existsSync(subGit)) {
            const changes = getLocalGitChanges(join(fullDir, name))
            if (changes) {
              localGitChanges.set(name, changes)
            } else {
              localGitChanges.delete(name)
            }
          }
        }
      } catch {}
    }
  }

  function getLocalVersion(entry) {
    const short = shortName(entry.name)
    const kind = entry.kind
    if (entry.localSource) {
      const pkgJsonPath = join(workspaceRoot, KINDS[kind].workspaceDir, short, 'package.json')
      if (existsSync(pkgJsonPath)) {
        try {
          return JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version
        } catch {}
      }
    } else {
      const nodeModulesPath = join(workspaceRoot, 'desktop', 'node_modules', entry.name, 'package.json')
      if (existsSync(nodeModulesPath)) {
        try {
          return JSON.parse(readFileSync(nodeModulesPath, 'utf8')).version
        } catch {}
      }
      try {
        const desktopPkg = JSON.parse(readFileSync(join(workspaceRoot, 'desktop', 'package.json'), 'utf8'))
        const versionSpec = desktopPkg.dependencies?.[entry.name] || desktopPkg.devDependencies?.[entry.name]
        if (versionSpec) {
          return versionSpec.replace(/[\^~]/g, '')
        }
      } catch {}
    }
    return null
  }

  function semverCompare(v1, v2) {
    const parse = (v) => String(v).replace(/^[^\d]+/, '').split('.').map(Number)
    const a = parse(v1)
    const b = parse(v2)
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const na = a[i] || 0
      const nb = b[i] || 0
      if (na < nb) return -1
      if (na > nb) return 1
    }
    return 0
  }

  async function checkRepoUpdate(dir) {
    try {
      await spawnAsync('git', ['fetch'], {
        cwd: dir,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', SSH_ASKPASS: '', DISPLAY: '' }
      })

      const behind = execSync('git rev-list --count HEAD..@{u}', {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()

      const count = parseInt(behind, 10)
      return {
        hasUpdate: !isNaN(count) && count > 0,
        behindCount: isNaN(count) ? 0 : count,
      }
    } catch {
      try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()
        if (!branch || branch === 'HEAD') return { hasUpdate: false, behindCount: 0 }

        const behind = execSync(`git rev-list --count HEAD..origin/${branch}`, {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()

        const count = parseInt(behind, 10)
        return {
          hasUpdate: !isNaN(count) && count > 0,
          behindCount: isNaN(count) ? 0 : count,
        }
      } catch {
        return { hasUpdate: false, behindCount: 0 }
      }
    }
  }

  async function runUpdateWizard(updates) {
    if (isInstalling) {
      setStatus('Install/update process already running.', 'error')
      return
    }
    setInstalling(true)

    // Determine steps to execute and compute totalSteps
    const stepsToExecute = []
    let needInstall = false

    for (const [name, updateInfo] of updates) {
      if (name === 'client') {
        stepsToExecute.push({
          label: 'Updating client itself via git pull…',
          action: async () => {
            await spawnAsync('git', ['pull'], { cwd: workspaceRoot })
          }
        })
        needInstall = true
        continue
      }

      const entry = catalog.find(e => e.shortName === name || e.name === name)
      if (entry) {
        if (entry.localSource) {
          const kind = entry.kind
          const localDir = join(workspaceRoot, KINDS[kind].workspaceDir, name)
          stepsToExecute.push({
            label: `Updating ${name} via git pull…`,
            action: async () => {
              await spawnAsync('git', ['pull'], { cwd: localDir })
            }
          })
          needInstall = true
        } else {
          const latestVer = updateInfo.latestVersion
          stepsToExecute.push({
            label: `Updating ${entry.name} to ${latestVer} via npm…`,
            action: async () => {
              await spawnAsync('pnpm', ['--filter', 'desktop', 'add', `${entry.name}@${latestVer}`], { cwd: workspaceRoot })
            }
          })
        }
      }
    }

    if (needInstall) {
      stepsToExecute.push({
        label: 'Running pnpm install to update dependencies…',
        action: async () => {
          await spawnAsync('pnpm', ['install'], { cwd: workspaceRoot })
        }
      })
    }

    const totalSteps = stepsToExecute.length
    let currentStepIndex = 0

    // Configure and show progress overlay
    installProgressOverlay.setLabel(cardLabel(' Syncing Workspace '))
    installProgressOverlay.show()
    installProgressOverlay.setFront()
    installProgressOverlay.focus()

    const updateProgress = (label) => {
      saveProgress = {
        step: Math.min(currentStepIndex + 1, totalSteps),
        total: totalSteps,
        label
      }
      setStatus(label)
    }

    startSpinner('Running Update Wizard…', true)
    renderAll()

    try {
      for (const step of stepsToExecute) {
        updateProgress(step.label)
        await step.action()
        currentStepIndex++
      }

      setStatus('All updates applied successfully!', 'ok')
      packageUpdates.clear()
    } catch (err) {
      hasInstallError = true
      setStatus(`Update Wizard failed: ${err.message}`, 'error')
    } finally {
      saveProgress = null
      installProgressOverlay.hide()
      setInstalling(false)
      stopSpinner()
      focusCatalog()
      renderAll()
    }
  }

  async function checkForUpdates({ silent = false } = {}) {
    if (checkingUpdates) return
    checkingUpdates = true
    if (!silent) {
      startSpinner('Checking for GitHub & NPM updates…')
      renderAll()
    }

    try {
      const repos = []
      // 1. Client itself
      repos.push({ name: 'client', dir: workspaceRoot })

      // 2. Sub-repositories
      const checkDirs = ['apps', 'themes', 'packages']
      for (const dirName of checkDirs) {
        const fullDir = join(workspaceRoot, dirName)
        if (!existsSync(fullDir)) continue
        try {
          const subdirs = readdirSync(fullDir, { withFileTypes: true })
          for (const subdir of subdirs) {
            if (!subdir.isDirectory()) continue
            const name = subdir.name
            if (name.startsWith('.')) continue
            const subGit = join(fullDir, name, '.git')
            if (existsSync(subGit)) {
              repos.push({ name, dir: join(fullDir, name) })
            }
          }
        } catch {}
      }

      // 3. NPM packages from catalog
      const npmPackages = catalog.filter(e => e.installed && !e.localSource)

      // Run parallel checks
      await Promise.all([
        ...repos.map(async (repo) => {
          const res = await checkRepoUpdate(repo.dir)
          if (res.hasUpdate) {
            packageUpdates.set(repo.name, {
              ...res,
              localGit: true
            })
          } else {
            packageUpdates.delete(repo.name)
          }
        }),
        ...npmPackages.map(async (item) => {
          const localVer = getLocalVersion(item)
          if (!localVer) return
          try {
            const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(item.name)}/latest`)
            if (res.ok) {
              const json = await res.json()
              const latestVer = json.version
              if (latestVer && semverCompare(localVer, latestVer) < 0) {
                packageUpdates.set(item.shortName, {
                  hasUpdate: true,
                  behindCount: 0,
                  localVersion: localVer,
                  latestVersion: latestVer
                })
                return
              }
            }
          } catch {}
          packageUpdates.delete(item.shortName)
        })
      ])

      const updateCount = packageUpdates.size
      if (!silent) stopSpinner()

      if (updateCount > 0) {
        showUpdateSelectionDialog({
          title: 'Updates Available',
          updates: [...packageUpdates.entries()]
        }).then((runWizard) => {
          if (runWizard) {
            runUpdateWizard([...packageUpdates.entries()])
          }
        })
      } else {
        if (!silent) {
          setStatus('All repositories and packages are up-to-date.', 'ok')
        }
      }
    } catch (err) {
      if (!silent) {
        stopSpinner()
        setStatus(`Failed to check updates: ${err.message}`, 'error')
      }
    } finally {
      checkingUpdates = false
      renderAll()
    }
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
      case 'check-updates':
        await checkForUpdates()
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
    const orgsRaw = trustedOrgsInput.getValue().trim()
    const githubOrgs = orgsRaw
      ? orgsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : ['owdproject']
    const user = settings.githubUser || (sshAuthStatus?.available ? sshAuthStatus.githubLogin : null)
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
        const name = item.name
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
      `{bold}Discord Server{/} · Join the community: https://discord.gg/owdproject`,
      `{bold}Tip{/} · Press {${C.accent}-fg}Space{/} on any app or module to toggle installation/removal`,
      `{bold}Tip{/} · Press {${C.accent}-fg}1{/}, {${C.accent}-fg}2{/}, or {${C.accent}-fg}3{/} keys to switch catalog tabs`,
      `{bold}Tip{/} · Press {${C.accent}-fg}w{/} to review changes and launch the package install wizard`,
      `{bold}Tip{/} · Press {${C.accent}-fg}g{/} to configure your GitHub user for forks/clones`,
      `{bold}Tip{/} · Press {${C.accent}-fg}o{/} to cycle catalog sorting, or {${C.accent}-fg}O{/} for sort menu`,
      `{bold}Tip{/} · Press {${C.accent}-fg}m{/} to open the command action menu`,
      `{bold}Tip{/} · Click anywhere on the bottom status bar to force-refresh catalog`,
      `{bold}Tip{/} · Press {${C.accent}-fg}s{/} to start dev server, {${C.accent}-fg}x{/} to stop, and {${C.accent}-fg}R{/} to reboot`,
      `{bold}Tip{/} · Press {${C.accent}-fg}l{/} to focus Logs; press {${C.accent}-fg}Esc{/} to return to Catalog`,
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
      const name = item.name
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
      const name = app.name
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
      const name = mod.name
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
      const name = theme.name
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
    const serverRunning = clientStatus.running || http.up
    if (devPhase === 'starting') {
      // Keep starting state
    } else if (serverRunning) {
      devPhase = 'running'
    } else {
      devPhase = 'stopped'
    }

    clientBox.style.border.fg = serverRunning ? C.focus : C.border
    metricsBox.style.border.fg = serverRunning ? C.focus : C.border

    const boxWidth = clientBox.width || 50
    const maxValLen = Math.max(10, boxWidth - 16)

    const stateUrl = `http://127.0.0.1:${settings.devPort}`
    let stateLine
    if (devPhase === 'starting') {
      stateLine = `  {${C.warn}-fg}…{/} {bold}STARTING{/}  ${stateUrl}`
    } else if (serverRunning) {
      stateLine = `  {${C.accent}-fg}●{/} {bold}RUNNING{/}   {cyan-fg}${stateUrl}{/}  {${C.muted}-fg}(PID ${clientStatus.pid}){/}`
    } else {
      stateLine = `  {${C.err}-fg}○{/} {bold}STOPPED{/}   ${stateUrl}`
    }

    const docsInstalled = hasDocsModuleInstalled(config, deps)
    let extraLine = null
    if (playgroundActive && playgroundLabel) {
      extraLine = `  {${C.muted}-fg}Playground{/} {bold}${playgroundLabel}{/} active`
      if (docsInstalled && serverRunning) {
        extraLine += `  ·  {${C.muted}-fg}Docs{/} ${keyHint('i')} open`
      }
    } else if (docsInstalled) {
      extraLine = serverRunning
        ? `  {${C.muted}-fg}Docs{/}       ${keyHint('i')} open  ·  ${docsBasePathFromConfig(config)}`
        : `  {${C.muted}-fg}Docs{/}       ${keyHint('d')} start server to view docs`
    } else {
      extraLine = `  {${C.muted}-fg}System{/}     ready`
    }

    const configRestartText = 'desktop.config.ts updated — Nuxt is restarting (see dev server log)'
    const maxRestartLen = Math.max(10, boxWidth - 8)
    const configRestartDisplay = configRestartText.length > maxRestartLen
      ? configRestartText.slice(0, maxRestartLen - 3) + '...'
      : configRestartText
    const configRestartLine =
      configRestartHintUntil > Date.now() && serverRunning
        ? `  {${C.devMode}-fg}ℹ{/} {${C.muted}-fg}${configRestartDisplay}{/}`
        : null

    const workspaceShortPath = workspaceRoot.replace(process.env.HOME || '', '~')
    const workspaceDisplayPath = workspaceShortPath.length > maxValLen
      ? '...' + workspaceShortPath.slice(-(maxValLen - 3))
      : workspaceShortPath

    // Theme details
    const activeThemeName = (pendingTheme ?? config.theme ?? '—').replace('@owdproject/', '')
    const themePendingAsterisk = (pendingTheme && pendingTheme !== config.theme) ? ` {${C.warn}-fg}*{/}` : ''
    const themeLine = `  {${C.muted}-fg}Theme{/}      ${activeThemeName}${themePendingAsterisk}`

    // Git info & workspace changes/warnings integration
    const gitInfo = getGitStatus(workspaceRoot)
    const gitWarnings = getMissingGitWarnings(workspaceRoot)
    const gitWarningBadge = gitWarnings.length > 0 ? ' {yellow-fg}⚠️{/}' : ''
    const gitChanges = getWorkspaceGitChanges(workspaceRoot)
    const hasChanges = gitChanges.added > 0 || gitChanges.modified > 0 || gitChanges.deleted > 0

    // Check if client repo has an update
    const clientUpdate = packageUpdates.get('client')
    const updateStr = (clientUpdate && clientUpdate.hasUpdate)
      ? `  ·  {yellow-fg}update available (↑${clientUpdate.behindCount}){/}`
      : ''

    let gitDisplayText
    if (hasChanges) {
      const parts = []
      if (gitChanges.added > 0) parts.push(`{${C.add}-fg}+${gitChanges.added}{/}`)
      if (gitChanges.modified > 0) parts.push(`{${C.warn}-fg}~${gitChanges.modified}{/}`)
      if (gitChanges.deleted > 0) parts.push(`{${C.remove}-fg}-${gitChanges.deleted}{/}`)

      const repoParts = []
      if (gitChanges.mainRepo > 0) repoParts.push('root')
      if (gitChanges.appsRepos > 0) repoParts.push(`${gitChanges.appsRepos} app`)
      if (gitChanges.modulesRepos > 0) repoParts.push(`${gitChanges.modulesRepos} mod`)
      if (gitChanges.themesRepos > 0) repoParts.push(`${gitChanges.themesRepos} tem`)

      const repoStr = repoParts.length > 0 ? ` (in ${repoParts.join(', ')})` : ''
      gitDisplayText = `branch: ${gitInfo.branch}${gitWarningBadge}  ·  changes: ${parts.join(' ')}${repoStr}${updateStr}`
    } else {
      gitDisplayText = `branch: ${gitInfo.branch}${gitWarningBadge}  ·  status: clean${updateStr}`
    }

    const gitDisplay = gitDisplayText.length > maxValLen
      ? gitDisplayText.slice(0, maxValLen - 3) + '...'
      : gitDisplayText

    // Versions
    const versionsText = `Node ${process.version}  ·  Nuxt ${nuxtVersion}  ·  PNPM ${pnpmVersion}`
    const versionsDisplay = versionsText.length > maxValLen
      ? versionsText.slice(0, maxValLen - 3) + '...'
      : versionsText

    const configErrorMsg = configError ? configError.split('\n')[0] : ''
    const configErrorDisplay = configErrorMsg.length > maxValLen
      ? configErrorMsg.slice(0, maxValLen - 3) + '...'
      : configErrorMsg

    const workspaceLine = configError
      ? `  {${C.err}-fg}⚠️ Config Error:{/} {${C.warn}-fg}${configErrorDisplay}{/}`
      : configRestartLine
        ? configRestartLine
        : `  {${C.muted}-fg}Workspace{/}  ${workspaceDisplayPath}`

    const contentLines = [
      stateLine,
      truncateFormatted(extraLine, boxWidth - 4),
      themeLine,
      '',
      workspaceLine,
      `  {${C.muted}-fg}Git{/}        ${gitDisplay}`,
      `  {${C.muted}-fg}Versions{/}   ${versionsDisplay}`,
    ]

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

    // Compute local stats
    let localAppsCount = 0
    let localModulesCount = 0
    let localThemesCount = 0
    try {
      localAppsCount = readdirSync(join(workspaceRoot, 'apps')).filter(d => !d.startsWith('.')).length
    } catch {}
    try {
      localModulesCount = readdirSync(join(workspaceRoot, 'packages')).filter(d => !d.startsWith('.') && !d.startsWith('core') && !d.startsWith('nx') && !d.startsWith('kit-')).length
    } catch {}
    try {
      localThemesCount = readdirSync(join(workspaceRoot, 'themes')).filter(d => !d.startsWith('.')).length
    } catch {}

    // Compute registry stats
    const totalStars = catalog.reduce((acc, item) => acc + (item.stars ?? 0), 0)
    let totalCatalogDownloads = 0
    for (const item of catalog) {
      const name = item.name
      const dls = npmDownloads[name]
      if (dls !== undefined) {
        totalCatalogDownloads += dls
      }
    }

    const ghUserText = settings.githubUser ? `${settings.githubUser}` : '(not set)'
    const sshText = sshAuthStatus?.available
      ? `{${C.accent}-fg}SSH ok{/}`
      : `{${C.warn}-fg}HTTPS{/}`
    const trustedText = trustedPublishers(settings.githubOrgs, settings.githubUser).join(', ')
    const catalogCountText = catalog.length
      ? `${catalog.length} pkgs${catalogCacheAge ? ` (${catalogCacheAge})` : ''}`
      : 'loading…'

    const maxInnerLines = 7
    const metricsLines = [
      `  {${C.muted}-fg}Memory{/}   {bold}${memLabel}{/}  {${C.accent}-fg}${spark}{/}`,
      `  {${C.muted}-fg}Local{/}    {bold}${localAppsCount}{/} apps · {bold}${localModulesCount}{/} modules · {bold}${localThemesCount}{/} themes`,
      `  {${C.muted}-fg}Registry{/} {bold}${totalStars}{/} stars · {bold}${totalCatalogDownloads.toLocaleString('en-US')}{/} dls/wk`,
      `  {${C.muted}-fg}GitHub{/}   {bold}${ghUserText}{/} · ${sshText}`,
      `  {${C.muted}-fg}Catalog{/}  {bold}${catalogCountText}{/} · {${C.muted}-fg}Trust:{/} ${trustedText}`,
    ]

    const showcaseItems = getShowcaseItems()
    if (showcaseItems.length > 0) {
      const showcaseItem = showcaseItems[showcaseIndex % showcaseItems.length]
      const boxWidth = metricsBox.width || 40
      const borderLine = ` {${C.borderDim}-fg}${ '─'.repeat(Math.max(10, boxWidth - 4)) }{/}`

      const padCount = maxInnerLines - metricsLines.length - 2
      for (let i = 0; i < padCount; i++) {
        metricsLines.push('')
      }

      metricsLines.push(borderLine)
      metricsLines.push(`  ${truncateFormatted(showcaseItem, boxWidth - 4)}`)
    }

    metricsBox.setContent(metricsLines.join('\n'))
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
        { colors: FORMAT_COLORS, columns: currentColumns, packageUpdates, localGitChanges },
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
      { colors: FORMAT_COLORS, columns: currentColumns, packageUpdates, localGitChanges },
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
    headerBar.setContent(formatHeaderLine(FORMAT_COLORS, currentColumns))
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
        ? `${KINDS[activeTab].label} — Space select theme · ${keyHint('s')} save`
        : `${KINDS[activeTab].label} — Space toggle · ${keyHint('s')} save`
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
      setStatus(`Theme → ${item.shortName} — ${keyHint('s')} save`, 'ok')
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
        `${next ? 'Queued install' : 'Queued remove'} ${item.shortName} — ${keyHint('s')} review`,
      )
    }

    renderCatalogList()
    renderMetrics()
    renderClient()
    renderDetail()
    screen.render()
  }

  function setCatalogStateAt(index, forceState) {
    if (activeTab === 'theme') {
      if (forceState === true) {
        selectThemeAt(index)
      }
      return
    }

    const entries = catalogEntries()
    const item = entries[index]
    if (!item) return

    const isCurrentDesired = pendingPackages.has(item.name)
      ? pendingPackages.get(item.name)
      : item.installed

    if (isCurrentDesired === forceState) {
      if (pendingPackages.has(item.name)) {
        pendingPackages.delete(item.name)
        installChoices.delete(item.name)
        setStatus(`Restored ${item.shortName}`)
      }
    } else {
      pendingPackages.set(item.name, forceState)
      setStatus(
        `${forceState ? 'Queued install' : 'Queued remove'} ${item.shortName} — ${keyHint('s')} review`,
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

    for (const pkg of installChoices.keys()) {
      const choice = installChoices.get(pkg)
      if (choice?.type === 'npm') {
        if (!packagesToInstall.includes(pkg)) {
          packagesToInstall.push(pkg)
        }
      } else {
        if (
          !packagesToInstall.includes(pkg) &&
          !packagesToMaterialize.includes(pkg) &&
          !hasLocalWorkspaceSource(workspaceRoot, pkg)
        ) {
          packagesToMaterialize.push(pkg)
        }
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

    const kind = entry?.kind || 'module'
    const folder = kind === 'app' ? 'apps' : kind === 'theme' ? 'themes' : 'packages'
    const targetDir = `${folder}/${shortName(pkg)}`

    if (installWizardIsStartup) {
      installWizardOverlay.height = 19
      installWizardHeader.height = 6
      installWizardList.top = 8
      installWizardWarning.top = 6
    } else {
      installWizardOverlay.height = 16
      installWizardHeader.height = 3
      installWizardList.top = 6
      installWizardWarning.top = 4
    }

    const lines = [`{bold}${pkg}{/}`]
    if (entry?.description) {
      lines.push(`{${C.muted}-fg}${entry.description.slice(0, 90)}{/}`)
      lines.push('')
    }
    if (installWizardIsStartup) {
      lines.push(`{yellow-fg}Active package (workspace:*) but local folder is missing.{/}`)
    }
    lines.push(`{${C.muted}-fg}Destination path: {bold}${targetDir}/{/}{/}`)

    installWizardHeader.setContent(lines.join('\n'))

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
      let defaultIdx = 0
      const lastId = settings.lastInstallChoiceId
      if (lastId) {
        let found = installWizardOptions.findIndex((opt) => opt.id === lastId)
        if (found >= 0) {
          defaultIdx = found
        } else {
          const isSsh = lastId.includes('ssh')
          const isHttps = lastId.includes('https')
          const isNpm = lastId === 'npm'
          if (isNpm) {
            found = installWizardOptions.findIndex((opt) => opt.id === 'npm')
            if (found >= 0) defaultIdx = found
          } else {
            found = installWizardOptions.findIndex((opt) => {
              if (isSsh && opt.protocol === 'ssh') return true
              if (isHttps && opt.protocol === 'https') return true
              return false
            })
            if (found >= 0) defaultIdx = found
          }
        }
      }
      installWizardList.select(defaultIdx)
      installWizardFooter.setContent(
        `{${C.muted}-fg}↑↓ select source · Enter install · s skip · Esc cancel all{/}`,
      )
    }
  }

  async function openInstallWizardStep() {
    const pkg = installWizardQueue[installWizardIndex]
    if (!pkg) {
      if (installWizardAutoExecute) {
        closeInstallWizard()
        await executeInstallPlan()
      } else {
        closeInstallWizard(true)
      }
      return
    }

    const entry = catalog.find((e) => e.name === pkg)
    installWizardUntrusted = entry?.trusted === false
    installWizardConfirmUntrusted = false

    startSpinner(`Resolving sources for ${shortName(pkg)}…`)
    screen.render()

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

    stopSpinner()

    if (installWizardOptions.length === 0) {
      setStatus(`No install source for ${shortName(pkg)} — skipped`, 'error')
      installWizardIndex++
      await openInstallWizardStep()
      return
    }

    installWizardOpen = true
    updateCatalogKeysState()
    installWizardOverlay.setFront()
    installWizardOverlay.show()
    renderInstallWizardPanel()
    screen.render()
    installWizardList.focus()
    screen.render()
  }

  function closeInstallWizard(success = false) {
    installWizardOpen = false
    updateCatalogKeysState()
    installWizardOverlay.hide()
    installWizardQueue = []
    installWizardIndex = 0
    installWizardOptions = []
    installWizardUntrusted = false
    installWizardConfirmUntrusted = false
    installWizardIsStartup = false
    installWizardAutoExecute = true
    focusCatalog()
    screen.render()
    if (installWizardResolve) {
      const resolve = installWizardResolve
      installWizardResolve = null
      resolve(success)
    }
  }

  let installWizardProcessing = false

  async function skipInstallWizardStep() {
    if (installWizardProcessing) return
    installWizardProcessing = true
    try {
      installWizardIndex++
      if (installWizardIndex >= installWizardQueue.length) {
        closeInstallWizard(true)
        return
      }
      await openInstallWizardStep()
    } finally {
      installWizardProcessing = false
    }
  }

  async function confirmInstallWizardStep(choice) {
    const pkg = installWizardQueue[installWizardIndex]
    if (!pkg) return
    installChoices.set(pkg, choice)

    // Save choice to settings
    const option = installWizardOptions[installWizardList.selected]
    if (option) {
      settings.lastInstallChoiceId = option.id
      saveSettings(workspaceRoot, settings)
    }

    installWizardIndex++
    installWizardConfirmUntrusted = false
    if (installWizardIndex >= installWizardQueue.length) {
      closeInstallWizard(true)
      return
    }
    await openInstallWizardStep()
  }

  async function handleInstallWizardSelect() {
    if (installWizardProcessing) return
    installWizardProcessing = true
    try {
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
    } finally {
      installWizardProcessing = false
    }
  }

  function startInstallWizard(packagesToInstall, isStartup = false, { autoExecute = true, clearChoices: doClear = true } = {}) {
    return new Promise((resolve) => {
      if (packagesToInstall.length === 0) {
        resolve(true)
        return
      }
      installWizardIsStartup = isStartup
      installWizardAutoExecute = autoExecute
      installWizardResolve = resolve
      installWizardQueue = [...packagesToInstall]
      installWizardIndex = 0
      if (doClear) installChoices.clear()
      openInstallWizardStep()
    })
  }

  async function executeInstallPlan() {
    return await extExecuteInstallPlan(ctx)
  }

  async function applyChanges() {
    stopSpinner()
    return await runStartupInstallFlow({ isStartup: false })
  }

  async function syncDependenciesWithConfig() {
    const declared = [
      ...(config.apps ?? []),
      ...(config.modules ?? []),
      config.theme,
    ].filter(Boolean)

    const installedDeps = readDesktopDependencies(paths.packageJson)

    const missing = declared.filter(pkg => !installedDeps.includes(pkg))
    const extra = installedDeps.filter(pkg => !declared.includes(pkg))

    if (missing.length === 0 && extra.length === 0) {
      return // Already synced!
    }

    setStatus('Synchronizing dependencies with config…')
    startSpinner('Syncing package.json…')
    setInstalling(true)
    screen.render()

    try {
      // 1. Add missing dependencies
      for (const pkg of missing) {
        setStatus(`Installing missing package ${shortName(pkg)}…`)
        screen.render()
        await installPackage(pkg, settings, workspaceRoot, { stdio: 'pipe' })
      }

      // 2. Remove extra dependencies
      for (const pkg of extra) {
        setStatus(`Removing extra package ${shortName(pkg)}…`)
        screen.render()
        await spawnAsync('pnpm', ['remove', pkg], { cwd: paths.desktop })
      }

      // Reload dependencies
      deps = readDesktopDependencies(paths.packageJson)
      renderAll()
      setStatus('Dependencies synced successfully', 'ok')
    } catch (err) {
      hasInstallError = true
      setStatus(`Sync failed: ${err.message}`, 'error')
    } finally {
      setInstalling(false)
      stopSpinner()
      screen.render()
    }
  }

  async function startDevServer() {
    if (isStartingServer || devPhase === 'starting') {
      setStatus('Dev server is already starting…')
      return
    }
    if (isDevServerUp()) {
      setStatus(`Dev server already running — ${keyHint('m')} menu to stop or reboot`, 'info')
      return
    }

    isStartingServer = true
    updateCatalogKeysState()

    try {
      const queue = pendingQueueSummary()
      if (queue) {
        const confirmSave = await showCustomConfirm({
          title: 'Unsaved Changes',
          message: `You have unsaved changes: ${queue}\nSave and apply changes before starting the dev server?`,
          yesText: 'Save & Start',
          noText: 'Discard & Start',
          cancelText: 'Cancel',
          height: 13,
        })

        if (confirmSave === null) {
          setStatus('Start aborted', 'info')
          return
        }

        if (confirmSave) {
          const saveOk = await applyChanges()
          if (!saveOk) {
            setStatus('Start aborted — changes could not be saved/applied', 'error')
            return
          }
        } else {
          pendingPackages.clear()
          pendingTheme = config.theme
          installChoices.clear()
          renderAll()
        }
      }

      startSpinner('Initializing startup checks…')
      renderAll()

      const ok = await runStartupInstallFlow({ isStartup: true })

      if (!ok) {
        devPhase = 'stopped'
        stopSpinner()
        renderAll()
        return
      }

      await syncDependenciesWithConfig()

      // Compile stubs before dev server boots
      startSpinner('Preparing workspace modules…')
      renderAll()
      try {
        await runPrepareModules(workspaceRoot, 'pipe')
      } catch (err) {
        // Log error but attempt to start server anyway so the user can inspect Nuxt log details
        setStatus(`Preparing modules failed: ${err.message}`, 'error')
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
    } catch (err) {
      setStatus(`Server start failed: ${err.message}`, 'error')
      devPhase = 'stopped'
      stopSpinner()
      renderAll()
    } finally {
      isStartingServer = false
      updateCatalogKeysState()
      screen.render()
    }
  }

  async function stopDevServer() {
    if (devPhase === 'starting') {
      setStatus('Stopping dev server startup…')
      stopDev(workspaceRoot, clientStatus.pid)
      devPhase = 'stopped'
      stopSpinner()
      stopLogWatcher()
      renderAll()
      setStatus('Startup cancelled', 'info')
      return
    }
    if (!isDevServerUp()) {
      setStatus(`Dev server not running — press ${keyHint('d')} to start`, 'info')
      return
    }

    startSpinner('Stopping dev server…')
    stopDev(workspaceRoot, clientStatus.pid)
    devPhase = 'stopped'
    stopLogWatcher()
    memHistory.length = 0
    clientStatus = await waitForDevStop(workspaceRoot, settings.devPort)
    stopSpinner()
    renderAll()
    setStatus(`Dev server stopped — press ${keyHint('d')} to start`, 'ok')
  }

  async function rebootDevServer() {
    if (devPhase === 'starting') {
      setStatus('Cannot reboot while dev server is starting…')
      return
    }
    if (!isDevServerUp()) {
      setStatus(`Dev server not running — press ${keyHint('d')} to start`, 'info')
      return
    }

    devPhase = 'starting'
    startSpinner('Rebooting dev server…')
    clearLogsBox()
    stopLogWatcher()
    renderAll()
    stopDev(workspaceRoot, clientStatus.pid)
    memHistory.length = 0
    await waitForDevStop(workspaceRoot, settings.devPort)
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
      if (sshAuthStatus.available && sshAuthStatus.githubLogin) {
        settings.githubUser = sshAuthStatus.githubLogin
      }
      const result = await loadCatalog(workspaceRoot, settings, { force })
      catalog = result.entries
      catalogCacheAge = result.cacheAge ?? ''
      try {
        config = readDesktopConfig(paths.config, workspaceRoot)
        configError = null
      } catch (err) {
        configError = err.message
        config = { apps: [], modules: [], theme: null }
      }
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

  function getPackagesRequiredByTheme(workspaceRoot, themeName) {
    return getPackagesRequiredByThemeImport(workspaceRoot, themeName)
  }

  // Keep legacy alias used in startDevServer
  const getKitsRequiredByTheme = (wr, name) => getPackagesRequiredByTheme(wr, name)

  async function runStartupInstallFlow(opts = {}) {
    return await extRunStartupInstallFlow(ctx, opts)
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
  screen.key(['d', 'D'], () => {
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
      setStatus(`Start dev server ${keyHint('d')} before opening docs`, 'error')
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
  screen.key(['s', 'S'], () => {
    if (installWizardOpen) {
      skipInstallWizardStep()
    } else if (!overlayBlocksKeys()) {
      applyChanges()
    }
  })
  screen.key(['enter'], () => {
    if (installWizardOpen) {
      handleInstallWizardSelect()
    }
  })
  screen.key(['r'], () => {
    if (!overlayBlocksKeys()) refreshCatalog()
  })
  screen.key(['u', 'U'], () => {
    if (!overlayBlocksKeys()) checkForUpdates()
  })

  screen.key(['o'], () => {
    if (!overlayBlocksKeys()) cycleCatalogSort()
  })
  screen.key(['O'], () => {
    if (!overlayBlocksKeys()) openSortPicker()
  })

  function changeTab(tabName) {
    activeTab = tabName
    if (tabName === 'theme') {
      focusCatalog()
      renderCatalogList()
      restoreCatalogListSelection(catalogEntries(), pendingTheme ?? config.theme)
      renderLegendBar()
      applyFocusStyles()
      renderMetrics()
      renderDetail()
      renderTabs()
      screen.render()
    } else {
      focusCatalog()
      renderAll()
    }
  }

  screen.key(['1'], () => {
    if (overlayBlocksKeys()) return
    changeTab('app')
  })
  screen.key(['2'], () => {
    if (overlayBlocksKeys()) return
    changeTab('module')
  })
  screen.key(['3'], () => {
    if (overlayBlocksKeys()) return
    changeTab('theme')
  })

  const TABS = ['app', 'module', 'theme']

  function cycleTab(direction) {
    const currentIndex = TABS.indexOf(activeTab)
    if (currentIndex === -1) return
    let nextIndex = currentIndex + direction
    if (nextIndex < 0) nextIndex = TABS.length - 1
    if (nextIndex >= TABS.length) nextIndex = 0
    changeTab(TABS[nextIndex])
  }

  screen.key(['left'], () => {
    if (overlayBlocksKeys()) return
    if (screen.focused === catalogList) {
      cycleTab(-1)
    }
  })

  screen.key(['right'], () => {
    if (overlayBlocksKeys()) return
    if (screen.focused === catalogList) {
      cycleTab(1)
    }
  })

  tabBar.on('click', (data) => {
    if (overlayBlocksKeys()) return
    const relativeX = data.x - tabBar.aleft
    if (relativeX >= 1 && relativeX <= 5) {
      changeTab('app')
    } else if (relativeX >= 8 && relativeX <= 15) {
      changeTab('module')
    } else if (relativeX >= 18 && relativeX <= 24) {
      changeTab('theme')
    }
  })

  trustedOrgsInput.key(['enter'], () => saveSettingsFromOverlay())
  trustedOrgsInput.key(['escape'], () => closeSettings())
  settingsOverlay.key(['t', 'T'], () => {
    if (settingsOpen) testSshFromSettings()
  })

  installWizardList.key(['space'], () => {})
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
  catalogList.key(['space'], function () {
    if (overlayBlocksKeys()) return
    toggleCatalogAt(this.selected)
  })
  catalogList.key(['+'], function () {
    if (overlayBlocksKeys()) return
    setCatalogStateAt(this.selected, true)
  })
  catalogList.key(['-'], function () {
    if (overlayBlocksKeys()) return
    setCatalogStateAt(this.selected, false)
  })
  catalogList.key(['pageup'], function () {
    if (overlayBlocksKeys()) return
    this.up(listPageStep(this))
    renderDetail()
    this.screen.render()
  })
  catalogList.key(['pagedown'], function () {
    if (overlayBlocksKeys()) return
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
    showCustomConfirm({
      title: 'Confirm Refresh',
      message: '\n Do you want to force-refresh the GitHub package catalog?\n This will fetch package data from upstream.',
      yesText: ' Yes, force-refresh ',
      noText: ' No, cancel ',
      height: 11
    }).then((value) => {
      if (value) {
        refreshCatalog({ force: true })
      }
    })
  })

  await refreshCatalog({ force: false })
  updateLocalChanges()
  clientStatus = await getClientStatus(workspaceRoot, settings.devPort)
  devPhase = clientStatus.running ? 'running' : 'stopped'
  focusCatalog()
  if (isDevServerUp()) {
    startLogWatcher()
  }
  renderAll()
  checkForUpdates({ silent: true })

  screen.on('destroy', () => {
    if (configWatcher) {
      configWatcher.close()
    }
    stopLogWatcher()
  })

  startConfigWatcher()

  setStatus(
    `Select packages · ${keyHint('s')} opens install wizard · ${keyHint('u')} updates · ${keyHint('g')} settings · ${keyHint('d')} server`,
    'info',
  )

  let lastShowcaseTime = Date.now()
  let gitScanCycle = 0

  setInterval(async () => {
    const now = Date.now()
    if (now - lastShowcaseTime >= 5000) {
      showcaseIndex++
      lastShowcaseTime = now
    }

    gitScanCycle++
    if (gitScanCycle % 3 === 0 && !isInstalling) {
      updateLocalChanges()
      renderCatalogList()
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
