<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useApplicationMenu } from '../../../composables/useApplicationMenu'

const applicationManager = useApplicationManager()
const applicationMenu = useApplicationMenu()

function onAppEntryClick(entry: ApplicationEntryWithInherited) {
  void applicationManager.execAppCommand(entry.application.id, entry.command)
  applicationMenu.enabled.value = false
}
</script>

<template>
  <List>
    <ListItem
      v-if="applicationMenu.menuEntries.length === 0"
      class="owd-system-bar__applications-menu__empty opacity-60"
    >
      {{ $t('systemBar.applications.empty') }}
    </ListItem>
    <SystemBarApplicationsMenuApplicationItem
      v-for="entry of applicationMenu.menuEntries"
      :key="`${entry.application.id}:${entry.command}`"
      :entry="entry"
      @click="onAppEntryClick(entry)"
    />
  </List>
</template>
