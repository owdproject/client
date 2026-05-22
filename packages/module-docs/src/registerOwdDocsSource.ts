import type { Nuxt } from '@nuxt/schema'

export interface OwdDocsSource {
  /** Unique id (used for collection name). */
  id: string
  /** Absolute path to the content root. */
  cwd: string
  /** Glob of files relative to `cwd`. */
  include?: string
  /** Route prefix (default `/docs`). */
  prefix?: string
  /** Glob patterns to exclude. */
  exclude?: string[]
}

type NuxtWithDocsRegistry = Nuxt & { _owdDocsSources?: OwdDocsSource[] }

export function getOwdDocsSources(nuxt: Nuxt): OwdDocsSource[] {
  const target = nuxt as NuxtWithDocsRegistry
  target._owdDocsSources ??= []
  return target._owdDocsSources
}

/** Register extra markdown sources (call from other OWD modules, e.g. module-fs). */
export function registerOwdDocsSource(nuxt: Nuxt, source: OwdDocsSource) {
  getOwdDocsSources(nuxt).push(source)
}

export function collectionNameForSource(id: string) {
  return `owd_docs_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`
}
