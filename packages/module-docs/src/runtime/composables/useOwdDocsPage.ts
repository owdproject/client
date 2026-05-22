const OWD_DOCS_COLLECTIONS = [
  'owd_docs',
  'owd_docs_project',
  'owd_docs_module_fs',
  'owd_docs_user_0',
  'owd_docs_user_1',
] as const

export async function queryOwdDocsPage(path: string) {
  for (const name of OWD_DOCS_COLLECTIONS) {
    try {
      const doc = await queryCollection(name).path(path).first()
      if (doc) return doc
    } catch {
      /* collection not registered */
    }
  }
  return null
}
