export const DESKTOP_STORE_ID = 'desktop'
export const DESKTOP_WORKSPACE_STORE_ID = 'desktop/workspace'
export const DESKTOP_WINDOW_STORE_ID = 'desktop/window'
export const DESKTOP_VOLUME_STORE_ID = 'desktop/volume'
export const DESKTOP_DEFAULT_APPS_STORE_ID = 'desktop/defaultApps'

export const applicationWindowsStoreId = (appId: string) =>
  `desktop/application/${appId}/windows`

export const applicationMetaStoreId = (appId: string) =>
  `desktop/application/${appId}/meta`

export const STORE_ID_MIGRATION_FLAG = 'desktop/store-id-migration/v1'

/** Static legacy Pinia store ids mapped to their 3.4 replacements. */
export const LEGACY_STORE_ID_MAP: Record<string, string> = {
  'owd/desktop': DESKTOP_STORE_ID,
  'owd/desktop/workspace': DESKTOP_WORKSPACE_STORE_ID,
  'owd/desktop/window': DESKTOP_WINDOW_STORE_ID,
  'owd/desktop/volume': DESKTOP_VOLUME_STORE_ID,
  'owd/desktop/defaultApps': DESKTOP_DEFAULT_APPS_STORE_ID,
}

export const LEGACY_APPLICATION_STORE_PATTERN =
  /^owd\/application\/([^/]+)\/(windows|meta)$/

export function legacyApplicationStoreIdToNew(
  legacyId: string,
): string | null {
  const match = legacyId.match(LEGACY_APPLICATION_STORE_PATTERN)
  if (!match) return null

  const [, appId, kind] = match
  return `desktop/application/${appId}/${kind}`
}
