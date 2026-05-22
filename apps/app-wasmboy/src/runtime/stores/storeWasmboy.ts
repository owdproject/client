import { useApplicationMetaStore } from '@owdproject/core/runtime/stores/storeApplicationMeta'
import { reactive } from 'vue'

export const useWasmboyStore = useApplicationMetaStore(
  'org.owdproject.wasmboy',
  () => {
    const config = reactive({
      isGbcColorizationEnabled: true,
      speed: 1,
      screenSize: 1,
      isPausedByPlayer: false,
      gameTitleAsWindowName: false,
      atprotoSyncGameSaves: true,
    })

    return { config }
  },
)
