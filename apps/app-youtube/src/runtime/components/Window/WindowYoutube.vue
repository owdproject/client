<script setup lang="ts">
import { getYouTubeId, isValidYouTubeUrl } from '../../utils/utilYoutube'

const props = defineProps<{
  window?: IWindowController
}>()

function onYoutubePlayClick() {
  const url = window.prompt('Which video would you like to play?')

  if (url && isValidYouTubeUrl(url)) {
    props.window.meta.videoId = getYouTubeId(url)
  }
}
</script>

<template>
  <WindowIframe
    v-bind="$props"
    width="560"
    height="315"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    :src="`https://www.youtube.com/embed/${props.window.meta.videoId}?autoplay=${Number(props.window.meta.autoplay)}`"
  >
    <template #nav-append v-if="!props.window.meta.videoId">
      <ButtonWindowNav rounded @click="onYoutubePlayClick">
        <Icon name="mdi:play" />
      </ButtonWindowNav>
    </template>
  </WindowIframe>
</template>
