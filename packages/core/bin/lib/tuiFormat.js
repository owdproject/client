import { formatCatalogAge } from './catalog.js'
import { githubHtmlUrl } from './packageSources.js'

const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
function stripAnsi(str) {
  return String(str).replace(ansiRegex, '')
}

/** @typedef {{ pending?: boolean | undefined, colors?: Record<string, string>, columns?: Record<string, number> }} RowContext */

const COL = {
  sel: 3,
  name: 28,
  sources: 7,
  dir: 4,
  publisher: 20,
  meta: 14,
}

export function getColumnWidths(targetWidth) {
  const showChanges = targetWidth >= 110
  const changesWidth = showChanges ? 8 : 0
  const fixed = 3 + 7 + 4 + 14 + 5 + changesWidth
  const remaining = targetWidth - fixed

  let nameWidth = 28
  let pubWidth = 20

  if (remaining < 48) {
    const minName = 15
    const minPub = 10
    const minTotal = minName + minPub // 25
    if (remaining <= minTotal) {
      nameWidth = minName
      pubWidth = minPub
    } else {
      const ratio = (remaining - minTotal) / (48 - minTotal)
      nameWidth = Math.floor(minName + ratio * (28 - minName))
      pubWidth = remaining - nameWidth
    }
  } else {
    const extra = remaining - 48
    const extraName = Math.floor(extra * 0.6)
    const extraPub = extra - extraName
    nameWidth = 28 + extraName
    pubWidth = 20 + extraPub
  }

  return {
    sel: 3,
    name: nameWidth,
    sources: 7,
    dir: 4,
    changes: changesWidth,
    publisher: pubWidth,
    meta: 14,
  }
}


const DEFAULT_COLORS = {
  npm: '#7ee787',
  git: 'cyan',
  local: '#ff79c6',
  warn: 'yellow',
  add: '#7ee787',
  remove: 'red',
  accent: '#7ee787',
  muted: '#6c7086',
}

/**
 * @param {string} text
 * @param {number} width
 */
export function padCell(text, width) {
  const raw = String(text)
  if (raw.length >= width) return raw.slice(0, width)
  return raw + ' '.repeat(width - raw.length)
}

/**
 * @param {object} item
 */
export function selectionMarker(item) {
  const pending = item.pending
  const installed = item.installed
  if (pending === true) return '[+]'
  if (pending === false) return '[-]'
  if (installed) return '[*]'
  return '[ ]'
}

/**
 * @param {object} item
 */
export function sourceSlots(item) {
  const hasNpm = Boolean(item.sourcesMeta?.npm?.version)
  const hasGit = Boolean(item.htmlUrl || item.sourcesMeta?.github)
  const hasLoc = Boolean(item.localSource)
  return {
    npm: hasNpm ? 'NPM' : '---',
    git: hasGit ? 'GIT' : '---',
    loc: hasLoc ? 'LOC' : '---',
  }
}

/**
 * @param {object} item
 * @param {RowContext} [ctx]
 */
export function formatSelectionMarker(item, colors = DEFAULT_COLORS) {
  const pending = item.pending
  const installed = item.installed
  if (pending === true) return `{${colors.muted}-fg}[{/}{${colors.add}-fg}+{/}{${colors.muted}-fg}]{/}`
  if (pending === false) return `{${colors.muted}-fg}[{/}{${colors.remove}-fg}-{/}{${colors.muted}-fg}]{/}`
  if (installed) return `{${colors.muted}-fg}[{/}{${colors.accent}-fg}*{/}{${colors.muted}-fg}]{/}`
  return `{${colors.muted}-fg}[ ]{/}`
}

/**
 * @param {object} item
 * @param {RowContext} [ctx]
 */
export function formatCatalogRowPlain(item, ctx = {}) {
  const colors = { ...DEFAULT_COLORS, ...ctx.colors }
  const columns = { ...COL, ...ctx.columns }
  const slots = sourceSlots(item)
  const publisher = item.org && item.org !== 'workspace' ? item.org : 'owdproject'
  const stars = item.stars > 0 ? `*${item.stars}` : ''
  const age = formatCatalogAge(item.updatedAt ?? item.pushedAt)

  // 1. Status / Selection Marker (3 chars)
  const selTag = formatSelectionMarker(item, colors)

  // 2. Name Column (columns.name chars)
  let badgeText = (item.isNew || item.isRecent) ? ' new' : ''
  if (ctx.packageUpdates && ctx.packageUpdates.has(item.shortName)) {
    const updateInfo = ctx.packageUpdates.get(item.shortName)
    if (updateInfo && updateInfo.hasUpdate) {
      const upLabel = updateInfo.behindCount ? ` ↑${updateInfo.behindCount}` : ' ↑'
      badgeText = upLabel + badgeText
    }
  }
  const maxNameLen = columns.name - badgeText.length
  let namePart = item.shortName
  if (namePart.length > maxNameLen) {
    namePart = namePart.slice(0, maxNameLen)
  }
  let nameTag = `{bold}{${colors.accent}-fg}${namePart}{/}{/}`
  if (badgeText) {
    nameTag += `{${colors.warn}-fg}${badgeText}{/}`
  }
  const namePadLen = columns.name - namePart.length - badgeText.length
  if (namePadLen > 0) {
    nameTag += ' '.repeat(namePadLen)
  }

  // 3. Sources Column (7 chars)
  const srcNpm =
    slots.npm === 'NPM' ? `{${colors.npm}-fg}${slots.npm}{/}` : `{${colors.muted}-fg}${slots.npm}{/}`
  const srcGit =
    slots.git === 'GIT' ? `{${colors.git}-fg}${slots.git}{/}` : `{${colors.muted}-fg}${slots.git}{/}`
  const sources = `${srcNpm} ${srcGit}`

  // 3.5 DIR Column (4 chars)
  let dirTag = ''
  const isMissing = item.installed && !item.localSource
  if (isMissing) {
    dirTag = `{red-fg}MISS{/}`
  } else if (item.localSource) {
    dirTag = `{${colors.npm}-fg}OK{/}  `
  } else {
    dirTag = `{${colors.muted}-fg}---{/} `
  }

  // 4. Publisher Column (columns.publisher chars)
  let pubPart = publisher
  if (pubPart.length > columns.publisher) {
    pubPart = pubPart.slice(0, columns.publisher)
  }
  const pubColor = item.trusted === false ? colors.warn : colors.muted
  let pubTag = `{${pubColor}-fg}${pubPart}{/}`
  const pubPadLen = columns.publisher - pubPart.length
  if (pubPadLen > 0) {
    pubTag += ' '.repeat(pubPadLen)
  }

  // 5. Meta Column (columns.meta chars)
  let finalStars = stars
  let finalAge = age
  const metaText = [stars, age].filter(Boolean).join(' ')
  if (metaText.length > columns.meta) {
    if (stars && age) {
      const allowedAgeLen = columns.meta - stars.length - 1
      if (allowedAgeLen > 0) {
        finalAge = age.slice(0, allowedAgeLen)
      } else {
        finalAge = ''
        finalStars = stars.slice(0, columns.meta)
      }
    } else if (stars) {
      finalStars = stars.slice(0, columns.meta)
    } else if (age) {
      finalAge = age.slice(0, columns.meta)
    }
  }
  const finalMetaText = [finalStars, finalAge].filter(Boolean).join(' ')
  const metaPadLen = Math.max(0, columns.meta - finalMetaText.length)
  let metaTag = ' '.repeat(metaPadLen)
  if (finalStars && finalAge) {
    metaTag += `{yellow-fg}${finalStars}{/} {${colors.muted}-fg}${finalAge}{/}`
  } else if (finalStars) {
    metaTag += `{yellow-fg}${finalStars}{/}`
  } else if (finalAge) {
    metaTag += `{${colors.muted}-fg}${finalAge}{/}`
  }

  let changesTag = ''
  if (columns.changes > 0) {
    if (item.localSource && ctx.localGitChanges && ctx.localGitChanges.has(item.shortName)) {
      const ch = ctx.localGitChanges.get(item.shortName)
      const parts = []
      if (ch.added > 0) parts.push(`{${colors.add}-fg}+${ch.added}{/}`)
      if (ch.modified > 0) parts.push(`{${colors.warn}-fg}~${ch.modified}{/}`)
      if (ch.deleted > 0) parts.push(`{${colors.remove}-fg}-${ch.deleted}{/}`)

      const txt = parts.join(' ')
      const rawLen = stripAnsi(txt).length
      changesTag = txt + ' '.repeat(Math.max(0, columns.changes - rawLen))
    } else {
      changesTag = ' '.repeat(columns.changes)
    }
  }

  // Join columns with exactly one space (matching header format)
  const cols = [selTag, nameTag, sources, dirTag]
  if (columns.changes > 0) {
    cols.push(changesTag)
  }
  cols.push(pubTag, metaTag)
  return cols.join(' ')
}

/**
 * @param {Record<string, string>} [colors]
 */
export function formatLegendLine(colors = DEFAULT_COLORS) {
  const c = { ...DEFAULT_COLORS, ...colors }
  return [
    `{${c.add}-fg}[+]{/} add`,
    `{${c.remove}-fg}[-]{/} remove`,
    `{${c.accent}-fg}[*]{/} on desktop`,
    '|',
    `{${c.npm}-fg}NPM{/} registry`,
    `{${c.git}-fg}GIT{/} repo`,
    `{${c.local}-fg}LOC{/} workspace`,
    '|',
    `{${c.npm}-fg}OK{/} folder exists`,
    `{red-fg}MISS{/} folder missing`,
  ].join('  ')
}

/**
 * @param {object} item
 * @param {string} targetDir
 * @param {Record<string, string>} [colors]
 * @param {number} [width]
 */
export function formatDetailPanel(item, targetDir, colors = DEFAULT_COLORS, width = 76) {
  const c = { ...DEFAULT_COLORS, ...colors }
  const owner = item.org && item.org !== 'workspace' ? item.org : 'owdproject'
  const lines = [`{bold}{${c.accent}-fg}${item.shortName}{/}{/}`]

  const sourceParts = []
  if (item.sourcesMeta?.npm?.version) {
    sourceParts.push(`{${c.npm}-fg}NPM{/} ${item.sourcesMeta.npm.version}`)
  }
  const gitUrl = item.htmlUrl ?? githubHtmlUrl(owner, item.shortName)
  sourceParts.push(`{${c.git}-fg}GIT{/} ${gitUrl}`)
  if (item.localSource) {
    sourceParts.push(`{${c.local}-fg}LOC{/} ${targetDir}/`)
  }
  lines.push(`  Sources ..... ${sourceParts.join('   ')}`)

  const pub =
    item.trusted === false
      ? `{${c.warn}-fg}${owner} (untrusted){/}`
      : owner
  lines.push(`  Publisher ... ${pub}`)

  const starsStr = item.stars > 0 ? `{yellow-fg}★${item.stars}{/}` : '0'
  const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'
  const kindStr = item.kind ? item.kind.toUpperCase() : '—'
  lines.push(`  Stats ....... Stars: ${starsStr}   ·   Updated: ${dateStr}   ·   Type: ${kindStr}`)

  if (!item.localSource) {
    const cloneText = `  Clone ....... ${targetDir}/`
    const maxCloneLen = Math.max(15, width - 2)
    const truncatedCloneText = cloneText.length > maxCloneLen ? cloneText.slice(0, maxCloneLen - 3) + '...' : cloneText
    lines.push(`  {${c.muted}-fg}${truncatedCloneText}{/}`)
  }

  if (item.description) {
    const maxDescLen = Math.max(15, width - 4)
    lines.push(`  {${c.muted}-fg}${item.description.slice(0, maxDescLen)}{/}`)
  }

  const isMissing = item.installed && !item.localSource
  if (isMissing) {
    lines.push(`  {red-fg}{bold}⚠ WARNING: Local workspace folder is missing!{/}{/}`)
  }

  return lines.join('\n')
}

export function formatHeaderLine(colors = DEFAULT_COLORS, columns = COL) {
  const status = ' '.repeat(columns.sel || 3) + ' '
  const name = 'NAME'.padEnd(columns.name || 28, ' ') + ' '
  const sources = 'SOURCES'.padEnd(columns.sources || 7, ' ') + ' '
  const dir = 'DIR'.padEnd(columns.dir || 4, ' ') + ' '
  const changes = columns.changes > 0 ? 'CHANGES'.padEnd(columns.changes, ' ') + ' ' : ''
  const publisher = 'PUBLISHER'.padEnd(columns.publisher || 20, ' ') + ' '
  const meta = 'STARS/AGE'.padStart(columns.meta || 14, ' ')
  return `{bold}${status}${name}${sources}${dir}${changes}${publisher}${meta}{/}`
}

export { COL as TUI_COLUMN_WIDTHS }
