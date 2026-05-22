<script setup lang="ts">
import {useTemplateRef} from "vue"
import {computed} from "@vue/reactivity"
import {useApplicationManager} from "@owdproject/core/runtime/composables/useApplicationManager"

const applicationManager = useApplicationManager()
const menu = useTemplateRef('menu')

function launchDemoApp(index: number = 0) {
  const entry = applicationManager.appsEntries[index]
  entry.application.execCommand(entry.command)
}

function prepareDemoCommands() {
  const demoCommands = [];
  const startIndex = 1;
  const maxItems = Math.min(3, applicationManager.appsEntries.length - startIndex);

  for (let i = 0; i < maxItems; i++) {
    const index = startIndex + i;
    const entry = applicationManager.appsEntries[index];
    if (entry && entry.application && entry.command) {
      demoCommands.push({
        label: `Demo ${index}`,
        command: () => launchDemoApp(index)
      });
    }
  }

  return demoCommands;
}

const items = computed(() => {
  let items = []

  if (applicationManager.appsEntries.length > 0) {
    items = prepareDemoCommands()
  }

  return [
    {
      label: 'Examples',
      items
    }
  ]
})

function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>

<template>
  <div class="owd-docs-container">
    <div class="grid grid-flow-col py-12">
      <div>

        <div class="text-3xl opacity-50">
          A new way to shape digital spaces — for showcasing,<br />
          exploring, and building full windowed experiences.
        </div>

      </div>
      <div class="grid items-center justify-end">

        <Button
            type="button" icon="pi pi-ellipsis-v" @click="toggle"
            aria-haspopup="true" aria-controls="overlay_menu"
        >
          <Icon name="mdi:apps" :size="24" />
        </Button>
        <Menu ref="menu" id="overlay_menu" :model="items" :popup="true" />

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.p-button {
  width: 56px;
  height: 56px;
}
</style>