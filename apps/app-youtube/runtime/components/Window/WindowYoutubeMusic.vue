<script setup lang="ts">
import { getYouTubeId, isValidYouTubeUrl } from '../../utils/utilYoutube'

const props = defineProps<{
  window?: IWindowController
}>()

function onYoutubeMusicPlayClick() {
  const url = window.prompt('Which video would you like to play?')

  if (url && isValidYouTubeUrl(url)) {
    props.window.meta.videoId = getYouTubeId(url)
  }
}
</script>

<template>
  <WindowIframe
    v-bind="$props"
    width="315"
    height="315"
    :src="`https://www.youtube.com/embed/${props.window.meta.videoId}?autoplay=${Number(props.window.meta.autoplay)}`"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  >
    <template #nav-append v-if="!props.window.meta.videoId">
      <ButtonWindowNav rounded @click="onYoutubeMusicPlayClick">
        <Icon name="mdi:play" />
      </ButtonWindowNav>
    </template>
  </WindowIframe>
</template>
