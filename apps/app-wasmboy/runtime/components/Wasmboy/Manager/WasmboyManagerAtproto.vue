<script setup lang="ts">
import { useWasmboyStore } from 'owd-app-wasmboy/stores/storeWasmboy'

const wasmboyStore = useWasmboyStore()
</script>

<template>
  <div class="mb-2">
    <b>AT Protocol</b>
  </div>

  <label>
    <Checkbox binary v-model="wasmboyStore.config.atprotoSyncGameSaves" />
    Game saves will sync with your PDS
  </label>
</template>

<style scoped lang="scss"></style>
