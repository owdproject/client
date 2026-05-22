<script setup lang="ts">
import { inject } from 'vue'
import ContextMenu from 'primevue/contextmenu'
import type { IWindowController } from '@owdproject/core'
import ButtonWindowNavMinimize from '../Button/ButtonWindowNavMinimize.vue'
import ButtonWindowNavMaximize from '../Button/ButtonWindowNavMaximize.vue'
import ButtonWindowNavClose from '../Button/ButtonWindowNavClose.vue'
import { useWindowNavContextMenu } from '../../composables/useWindowNavContextMenu'

const windowController = inject<IWindowController>('windowController')
const { menu, items, onNavContextMenu } = useWindowNavContextMenu(windowController)

const windowNavContextMenuPt = {
  root: { class: 'nova-window-nav-context-menu' },
}

function onWindowMinimize() {
  if (!windowController?.instanced) return
  windowController.actions.minimize()
}

function onWindowMaximize() {
  if (!windowController?.instanced) return
  windowController.actions.toggleMaximize()
}

function onWindowNavDestroy() {
  if (!windowController?.instanced) return
  windowController.actions.destroy()
}
</script>

<template>
  <CoreWindowNav
    @dblclick="onWindowMaximize"
    @contextmenu="onNavContextMenu"
  >
    <div
      v-if="$slots.prepend"
      class="owd-window-nav__btn-group owd-window-nav__btn-group--prepend"
    >
      <slot name="prepend" />
    </div>

    <div
      v-if="windowController?.title"
      class="owd-window-nav__title"
    >
      <div
        class="owd-window-nav__title-inner text-ellipsis"
        v-text="windowController?.title"
      />
    </div>

    <div class="owd-window-nav__btn-group owd-window-nav__btn-group--append">
      <slot name="append" />

      <ButtonWindowNavMinimize
        v-if="!windowController?.instanced || windowController?.isMinimizable"
        @mousedown.stop
        @click.stop="onWindowMinimize"
      />
      <ButtonWindowNavMaximize
        v-if="windowController?.isMaximizable"
        @mousedown.stop
        @click.stop="onWindowMaximize"
      />
      <ButtonWindowNavClose
        v-if="!windowController?.instanced || windowController?.isDestroyable"
        @mousedown.stop
        @click.stop="onWindowNavDestroy"
      />
    </div>
  </CoreWindowNav>

  <ContextMenu ref="menu" :model="items" :pt="windowNavContextMenuPt" />
</template>

<style scoped lang="scss">
/* Layout only — colors in window-chrome.scss */
.owd-window-nav {
  &__btn-group {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--nova-window-nav-gap, 2px);
    padding: 0 var(--nova-window-nav-padding-x, 8px);
  }

  &__title {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    padding: 0 8px;
    text-align: center;

    &-inner {
      margin: 0 auto;
      max-width: 100%;
    }
  }
}
</style>
