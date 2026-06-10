import { beforeEach, describe, expect, it } from 'vitest'
import { STORE_ID_MIGRATION_FLAG } from '../runtime/stores/storeIds'
import { migratePersistedStoreIds } from '../runtime/utils/migratePersistedStoreIds'

function createMemoryStorage() {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
  } satisfies Storage
}

describe('migratePersistedStoreIds', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('migrates owd/desktop to desktop', () => {
    storage.setItem('owd/desktop', '{"workspace":{"active":"ws-1"}}')

    migratePersistedStoreIds(storage)

    expect(storage.getItem('desktop')).toBe('{"workspace":{"active":"ws-1"}}')
    expect(storage.getItem('owd/desktop')).toBeNull()
    expect(storage.getItem(STORE_ID_MIGRATION_FLAG)).toBe('done')
  })

  it('migrates dynamic application window and meta stores', () => {
    storage.setItem(
      'owd/application/org.foo.app/windows',
      '{"win-1":{"title":"Explorer"}}',
    )
    storage.setItem(
      'owd/application/org.foo.app/meta',
      '{"meta":{"pinned":true}}',
    )

    migratePersistedStoreIds(storage)

    expect(storage.getItem('desktop/application/org.foo.app/windows')).toBe(
      '{"win-1":{"title":"Explorer"}}',
    )
    expect(storage.getItem('desktop/application/org.foo.app/meta')).toBe(
      '{"meta":{"pinned":true}}',
    )
    expect(storage.getItem('owd/application/org.foo.app/windows')).toBeNull()
    expect(storage.getItem('owd/application/org.foo.app/meta')).toBeNull()
  })

  it('does not overwrite an existing new key', () => {
    storage.setItem('owd/desktop', '{"workspace":{"active":"legacy"}}')
    storage.setItem('desktop', '{"workspace":{"active":"current"}}')

    migratePersistedStoreIds(storage)

    expect(storage.getItem('desktop')).toBe('{"workspace":{"active":"current"}}')
    expect(storage.getItem('owd/desktop')).toBeNull()
  })

  it('is idempotent after the migration flag is set', () => {
    storage.setItem('owd/desktop', '{"workspace":{"active":"legacy"}}')
    migratePersistedStoreIds(storage)
    storage.setItem('owd/desktop', '{"workspace":{"active":"legacy-again"}}')

    migratePersistedStoreIds(storage)

    expect(storage.getItem('desktop')).toBe('{"workspace":{"active":"legacy"}}')
    expect(storage.getItem('owd/desktop')).toBe(
      '{"workspace":{"active":"legacy-again"}}',
    )
  })

  it('leaves unrelated localStorage keys untouched', () => {
    storage.setItem('unrelated-key', 'keep-me')
    storage.setItem('owd/desktop', '{"workspace":{"active":"ws-1"}}')

    migratePersistedStoreIds(storage)

    expect(storage.getItem('unrelated-key')).toBe('keep-me')
  })
})
