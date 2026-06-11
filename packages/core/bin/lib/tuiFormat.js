import { formatCatalogAge } from './catalog.js'
import { githubHtmlUrl } from './packageSources.js'

/** @typedef {{ pending?: boolean | undefined, colors?: Record<string, string> }} RowContext */

const COL = {
  sel: 3,
  name: 20,
  sources: 7,
  publisher: 16,
  meta: 12,
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
  const slots = sourceSlots(item)
  const publisher = item.org && item.org !== 'workspace' ? item.org : 'owdproject'
  const stars = item.stars > 0 ? `*${item.stars}` : ''
  const age = formatCatalogAge(item.updatedAt ?? item.pushedAt)

  // 1. Status / Selection Marker (3 chars)
  const selTag = formatSelectionMarker(item, colors)

  // 2. Name Column (20 chars)
  const badgeText = (item.isNew || item.isRecent) ? ' new' : ''
  const maxNameLen = COL.name - badgeText.length
  let namePart = item.shortName
  if (namePart.length > maxNameLen) {
    namePart = namePart.slice(0, maxNameLen)
  }
  let nameTag = `{bold}{${colors.accent}-fg}${namePart}{/}{/}`
  if (badgeText) {
    nameTag += `{${colors.warn}-fg}${badgeText}{/}`
  }
  const namePadLen = COL.name - namePart.length - badgeText.length
  if (namePadLen > 0) {
    nameTag += ' '.repeat(namePadLen)
  }

  // 3. Sources Column (7 chars)
  const srcNpm =
    slots.npm === 'NPM' ? `{${colors.npm}-fg}${slots.npm}{/}` : `{${colors.muted}-fg}${slots.npm}{/}`
  const srcGit =
    slots.git === 'GIT' ? `{${colors.git}-fg}${slots.git}{/}` : `{${colors.muted}-fg}${slots.git}{/}`
  const sources = `${srcNpm} ${srcGit}`

  // 4. Publisher Column (16 chars)
  let pubPart = publisher
  if (pubPart.length > COL.publisher) {
    pubPart = pubPart.slice(0, COL.publisher)
  }
  const pubColor = item.trusted === false ? colors.warn : colors.muted
  let pubTag = `{${pubColor}-fg}${pubPart}{/}`
  const pubPadLen = COL.publisher - pubPart.length
  if (pubPadLen > 0) {
    pubTag += ' '.repeat(pubPadLen)
  }

  // 5. Meta Column (12 chars)
  let finalStars = stars
  let finalAge = age
  const metaText = [stars, age].filter(Boolean).join(' ')
  if (metaText.length > COL.meta) {
    if (stars && age) {
      const allowedAgeLen = COL.meta - stars.length - 1
      if (allowedAgeLen > 0) {
        finalAge = age.slice(0, allowedAgeLen)
      } else {
        finalAge = ''
        finalStars = stars.slice(0, COL.meta)
      }
    } else if (stars) {
      finalStars = stars.slice(0, COL.meta)
    } else if (age) {
      finalAge = age.slice(0, COL.meta)
    }
  }
  const finalMetaText = [finalStars, finalAge].filter(Boolean).join(' ')
  const metaPadLen = Math.max(0, COL.meta - finalMetaText.length)
  let metaTag = ' '.repeat(metaPadLen)
  if (finalStars && finalAge) {
    metaTag += `{yellow-fg}${finalStars}{/} {${colors.muted}-fg}${finalAge}{/}`
  } else if (finalStars) {
    metaTag += `{yellow-fg}${finalStars}{/}`
  } else if (finalAge) {
    metaTag += `{${colors.muted}-fg}${finalAge}{/}`
  }

  // Join columns with exactly one space (matching header format)
  return `${selTag} ${nameTag} ${sources} ${pubTag} ${metaTag}`
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
    `{${c.warn}-fg}WRN{/} untrusted publisher`,
  ].join('  ')
}

/**
 * @param {object} item
 * @param {string} targetDir
 * @param {Record<string, string>} [colors]
 */
export function formatDetailPanel(item, targetDir, colors = DEFAULT_COLORS) {
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
  lines.push(`  Sources .... ${sourceParts.join('   ')}`)

  const pub =
    item.trusted === false
      ? `{${c.warn}-fg}${owner} (untrusted){/}`
      : owner
  lines.push(`  Publisher .. ${pub}`)

  if (!item.localSource) {
    lines.push(`  {${c.muted}-fg}Clone ....... ${targetDir}/{/}`)
  }

  if (item.description) {
    lines.push(`  {${c.muted}-fg}${item.description.slice(0, 100)}{/}`)
  }

  return lines.join('\n')
}

export function formatHeaderLine(colors = DEFAULT_COLORS) {
  const status = 'ST'.padEnd(3, ' ') + ' '
  const name = 'NAME'.padEnd(20, ' ') + ' '
  const sources = 'SOURCES'.padEnd(7, ' ') + ' '
  const publisher = 'PUBLISHER'.padEnd(16, ' ') + ' '
  const meta = 'STARS/AGE'.padStart(12, ' ')
  return `{bold}${status}${name}${sources}${publisher}${meta}{/}`
}

export { COL as TUI_COLUMN_WIDTHS }
