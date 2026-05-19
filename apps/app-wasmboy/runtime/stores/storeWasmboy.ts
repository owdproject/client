import { useApplicationMetaStore } from '@owdproject/core/runtime/stores/storeApplicationMeta'
import { reactive } from 'vue'

const config = reactive<any>({
  isGbcColorizationEnabled: true,
  speed: 1,
  screenSize: 1,
  isPausedByPlayer: false,
  gameTitleAsWindowName: false,
  atprotoSyncGameSaves: true,
})

export const useWasmboyStore = useApplicationMetaStore(
  'org.owdproject.wasmboy',
  {
    config,
  },
)
