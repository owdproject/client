<script setup lang="ts">
defineProps<{
  window: IWindowController
}>()

import { UseTimeAgo } from '@vueuse/components'
</script>

<template>
  <ul>
    <li>
      <b>ID</b><br />
      {{ window.state.id }}
    </li>
    <li>
      <b>Title</b><br />
      <InputText readonly v-model="window.title" />
    </li>
    <li>
      <b>Created at</b><br />
      <UseTimeAgo v-slot="{ timeAgo }" :time="window.state.createdAt">
        <InputText :value="timeAgo.toString()" />
      </UseTimeAgo>
    </li>
    <li>
      <b>Position</b><br />
      {{ window.state.position }}
    </li>
    <li>
      <b>Size</b><br />
      {{ window.state.size }}
    </li>
    <li>
      <label>
        <Checkbox binary v-model="window.state.resizable" />
        Resizable
      </label>
    </li>
    <li>
      <label>
        <Checkbox binary v-model="window.state.draggable" />
        Draggable
      </label>
    </li>
    <li>
      <label>
        <Checkbox binary v-model="window.state.destroyable" />
        Destroyable</label
      >
    </li>
    <li>
      <label>
        <Checkbox binary v-model="window.state.active" readonly />
        Active</label
      >
    </li>
    <li>
      <label>
        <Checkbox binary v-model="window.state.focused" readonly />
        Focused</label
      >
    </li>
    <li>
      <label>
        <Checkbox binary v-model="window.state.overflow" />
        Overflow</label
      >
    </li>
  </ul>
</template>
