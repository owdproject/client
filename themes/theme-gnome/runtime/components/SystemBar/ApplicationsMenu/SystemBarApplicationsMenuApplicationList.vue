<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationMenu } from '../../../composables/useApplicationMenu'

const applicationManager = useApplicationManager()
const applicationMenu = useApplicationMenu()

function onAppEntryClick(appEntry: ApplicationEntryWithInherited) {
  applicationManager.execAppCommand(appEntry.application.id, appEntry.command)

  applicationMenu.enabled.value = false
}
</script>

<template>
  <List>
    <SystemBarApplicationsMenuApplicationItem
      v-for="entry of applicationMenu.appEntriesByActiveCategory.value"
      :entry="entry"
      @click="onAppEntryClick(entry)"
    />
  </List>
</template>
