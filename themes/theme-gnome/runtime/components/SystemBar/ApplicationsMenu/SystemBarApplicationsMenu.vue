<script setup lang="ts">
import { useApplicationMenu } from '../../../composables/useApplicationMenu'
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'

import { useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const applicationMenu = useApplicationMenu()
const desktopManager = useDesktopManager()
const applicationMenuElement = useTemplateRef('applicationMenuElement')

onClickOutside(
  applicationMenuElement,
  () => (applicationMenu.enabled.value = false),
)
</script>

<template>
  <div ref="applicationMenuElement">
    <SystemBarButton
      @click="applicationMenu.enabled.value = !applicationMenu.enabled.value"
    >
      {{ $t('systemBar.applications.label') }}
    </SystemBarButton>

    <SystemBarMenu
      v-if="applicationMenu.enabled.value"
      class="owd-system-bar__applications-menu"
    >
      <div>
        <SystemBarApplicationsMenuCategories
          :categories="applicationMenu.categories.value"
          @select="
            (category) => (applicationMenu.categoryActive.value = category)
          "
        />
      </div>
      <div>
        <SystemBarApplicationsMenuApplicationList />
      </div>
    </SystemBarMenu>
  </div>
</template>

<style scoped lang="scss">
.owd-system-bar__applications-menu {
  left: var(--p-system-bar-menu-spacing);
  height: 440px;
  max-height: 80dvh;
  width: 400px;

  :deep(.p-card-content) {
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

  :deep(.owd-list-item) {
    &:hover {
      border-radius: 8px;
      background: rgba(var(--owd-hover-background-color));
    }
  }
}

.owd-system-bar__menu {
  &__title {
    background: var(--p-elevation-inactive);
    width: 36px;
  }

  &__list {
    min-width: 400px;

    &-item {
      cursor: pointer;
    }
  }
}
</style>
