<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

import WasmboyManagerGames from '../Wasmboy/Manager/WasmboyManagerGames.vue'
import WasmboyManagerSaves from '../Wasmboy/Manager/WasmboyManagerSaves.vue'
import WasmboyManagerSettings from '../Wasmboy/Manager/WasmboyManagerSettings.vue'
import WasmboyManagerAtproto from '../Wasmboy/Manager/WasmboyManagerAtproto.vue'

defineProps<{
  window: IWindowController
}>()

const applicationManager = useApplicationManager()
</script>

<template>
  <Window
    :window="window"
    :content="{ padded: true }"
    class="owd-wasmboy-manager"
  >
    <Tabs :value="0">
      <TabList>
        <Tab :value="0">Games</Tab>
        <Tab :value="1">Saves</Tab>
        <Tab :value="2">Settings</Tab>
        <Tab
          :value="3"
          v-if="applicationManager.isAppDefined('org.owdproject.atproto')"
          >ATProto</Tab
        >
      </TabList>
      <TabPanels>
        <TabPanel :value="0">
          <WasmboyManagerGames />
        </TabPanel>

        <TabPanel :value="1">
          <WasmboyManagerSaves />
        </TabPanel>

        <TabPanel :value="2">
          <WasmboyManagerSettings />
        </TabPanel>

        <TabPanel
          v-if="applicationManager.isAppDefined('org.owdproject.atproto')"
          :value="3"
        >
          <WasmboyManagerAtproto />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Window>
</template>

<style scoped lang="scss">
swiper-container,
swiper-slide {
  height: 100%;
}
</style>
