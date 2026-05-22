<script setup>
import { useNotificationsMenu } from '../../../composables/useNotificationsMenu'
import { useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const notificationsMenu = useNotificationsMenu()
const notificationsMenuElement = useTemplateRef('notificationsMenuElement')

onClickOutside(
  notificationsMenuElement,
  () => (notificationsMenu.enabled.value = false),
)
</script>

<template>
  <div ref="notificationsMenuElement">
    <SystemBarButton
      @click="
        notificationsMenu.enabled.value = !notificationsMenu.enabled.value
      "
    >
      <CoreTime />
    </SystemBarButton>

    <SystemBarMenu
      v-if="notificationsMenu.enabled.value"
      class="owd-system-bar__notifications-menu"
    >
    </SystemBarMenu>
  </div>
</template>

<style lang="scss" scoped>
.owd-system-bar__notifications-menu {
  left: 50%;
  transform: translateX(-50%);
  height: 440px;
  max-height: 80dvh;
  width: 400px;
  display: flex;
  flex-direction: row;

  > div {
    &:nth-child(1) {
      width: 40%;
    }

    &:nth-child(2) {
      width: 60%;
    }
  }
}
</style>
