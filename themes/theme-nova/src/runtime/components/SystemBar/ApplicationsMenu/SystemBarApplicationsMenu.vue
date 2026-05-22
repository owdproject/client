<script setup lang="ts">
import { watch } from 'vue'
import { useApplicationMenu } from '../../../composables/useApplicationMenu'
import { useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const applicationMenu = useApplicationMenu()
const applicationMenuElement = useTemplateRef('applicationMenuElement')

onClickOutside(applicationMenuElement, () => {
  applicationMenu.enabled.value = false
})

function toggleApplicationsMenu() {
  applicationMenu.enabled.value = !applicationMenu.enabled.value
}

watch(
  () => applicationMenu.enabled.value,
  (open) => {
    if (!open) return
    const cats = applicationMenu.categories.value
    if (cats.length) {
      applicationMenu.categoryActive.value = cats[0]
    }
  },
)
</script>

<template>
  <div ref="applicationMenuElement" class="owd-system-bar__applications-menu-anchor">
    <SystemBarButton @click.stop="toggleApplicationsMenu">
      {{ $t('systemBar.applications.label') }}
    </SystemBarButton>

    <SystemBarMenu
      v-if="applicationMenu.enabled"
      class="owd-system-bar__applications-menu"
    >
      <div class="owd-system-bar__applications-menu__categories">
        <SystemBarApplicationsMenuCategories
          :categories="applicationMenu.categories"
          :active="applicationMenu.categoryActive"
          @select="(category) => (applicationMenu.categoryActive = category)"
        />
      </div>
      <div class="owd-system-bar__applications-menu__apps">
        <SystemBarApplicationsMenuApplicationList />
      </div>
    </SystemBarMenu>
  </div>
</template>

<style scoped lang="scss">
.owd-system-bar__applications-menu-anchor {
  position: relative;
  display: inline-block;
}

.owd-system-bar__applications-menu {
  left: 0;
  height: 440px;
  max-height: 80dvh;
  width: min(400px, 92vw);
  display: flex;
  flex-direction: row;
  z-index: 1;

  &__categories {
    width: 40%;
    min-width: 120px;
    overflow-y: auto;
  }

  &__apps {
    width: 60%;
    overflow-y: auto;
  }

  :deep(.owd-list-item) {
    &:hover {
      border-radius: 8px;
      background: rgba(var(--owd-hover-background-color));
    }
  }
}
</style>
