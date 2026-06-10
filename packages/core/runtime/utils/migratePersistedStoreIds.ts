import {
  LEGACY_STORE_ID_MAP,
  STORE_ID_MIGRATION_FLAG,
  legacyApplicationStoreIdToNew,
} from '../stores/storeIds'

function migrateStorageKey(
  storage: Storage,
  legacyId: string,
  newId: string,
) {
  const legacyValue = storage.getItem(legacyId)
  if (legacyValue === null) return

  if (storage.getItem(newId) !== null) {
    storage.removeItem(legacyId)
    return
  }

  storage.setItem(newId, legacyValue)
  storage.removeItem(legacyId)
}

function collectLegacyApplicationKeys(storage: Storage) {
  const keys: string[] = []

  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key && legacyApplicationStoreIdToNew(key)) {
      keys.push(key)
    }
  }

  return keys
}

/**
 * One-shot migration of persisted Pinia state from legacy `owd/*` store ids
 * to `desktop/*`. Runs before shell init so module-persistence hydrates new keys.
 */
export function migratePersistedStoreIds(storage: Storage = localStorage) {
  if (typeof storage?.getItem !== 'function') return
  if (storage.getItem(STORE_ID_MIGRATION_FLAG) === 'done') return

  for (const [legacyId, newId] of Object.entries(LEGACY_STORE_ID_MAP)) {
    migrateStorageKey(storage, legacyId, newId)
  }

  for (const legacyId of collectLegacyApplicationKeys(storage)) {
    const newId = legacyApplicationStoreIdToNew(legacyId)
    if (newId) {
      migrateStorageKey(storage, legacyId, newId)
    }
  }

  storage.setItem(STORE_ID_MIGRATION_FLAG, 'done')
}
