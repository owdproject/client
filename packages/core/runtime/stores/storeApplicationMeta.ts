import { defineStore } from 'pinia'
import { ref } from 'vue'

const metaStoreRegistry = new Map<string, ReturnType<typeof defineStore>>()
/** Store ids created by the generic fallback (only `meta`), replaceable when an app registers real state. */
const fallbackMetaStoreIds = new Set<string>()

type MetaStoreSetup = (() => Record<string, unknown>) | Record<string, unknown>

function resolveSetup(states: MetaStoreSetup) {
  return typeof states === 'function' ? states : () => states
}

/**
 * Per-app Pinia meta store factory. The first registration for an app id wins so
 * app modules should call this from their store module (imported in the app plugin
 * before `defineDesktopApp`).
 */
export const useApplicationMetaStore = (
  appId: string,
  states?: MetaStoreSetup,
) => {
  const id = `owd/application/${appId}/meta`

  if (
    states !== undefined &&
    (!metaStoreRegistry.has(id) || fallbackMetaStoreIds.has(id))
  ) {
    fallbackMetaStoreIds.delete(id)
    metaStoreRegistry.set(
      id,
      defineStore(id, resolveSetup(states), {
        persistedState: {
          persist: true,
        },
      }),
    )
  }

  if (!metaStoreRegistry.has(id)) {
    fallbackMetaStoreIds.add(id)
    metaStoreRegistry.set(
      id,
      defineStore(
        id,
        () => ({
          meta: ref<Record<string, unknown>>({}),
        }),
        {
          persistedState: {
            persist: true,
          },
        },
      ),
    )
  }

  return metaStoreRegistry.get(id)!
}
