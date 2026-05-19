<script setup lang="ts">
import { isValidSoundcloudUrl } from '../../utils/utilSoundcloud'

const props = defineProps<{
  window?: IWindowController
}>()

function onYoutubePlayClick() {
  const url = window.prompt('Which track would you like to play?')

  if (url && isValidSoundcloudUrl(url)) {
    props.window.meta.url = url
  }
}
</script>

<template>
  <WindowIframe
    width="560"
    height="171"
    :src="`https://w.soundcloud.com/player/?url=${props.window.meta.url}&auto_play=${props.window.meta.autoplay}`"
    allow="autoplay"
    v-bind="$props"
  >
    <template #nav-append v-if="!props.window.meta.url">
      <ButtonWindowNav rounded @click="onYoutubePlayClick">
        <Icon name="mdi:play" />
      </ButtonWindowNav>
    </template>
  </WindowIframe>
</template>
