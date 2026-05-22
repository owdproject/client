<script setup lang="ts">
import { inject, useSlots, computed } from 'vue'
import ContextMenu from 'primevue/contextmenu'
import type { IWindowController } from '@owdproject/core'
import NavIcon from '@owdproject/kit-fs/runtime/components/explorer/NavIcon.vue'
import ButtonWindowNavMinimize from '../../../components/Button/ButtonWindowNavMinimize.vue'
import ButtonWindowNavMaximize from '../../../components/Button/ButtonWindowNavMaximize.vue'
import ButtonWindowNavClose from '../../../components/Button/ButtonWindowNavClose.vue'
import { useWindowNavContextMenu } from '../../../composables/useWindowNavContextMenu'

const windowController = inject<IWindowController>('windowController')
const { menu, items, onNavContextMenu } = useWindowNavContextMenu(windowController)
const slots = useSlots()
const hasCustomTitle = computed(() => typeof slots.title === 'function')

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
    <slot name="prepend" />

    <slot v-if="hasCustomTitle" name="title" />

    <template v-else>
      <NavIcon
        v-if="windowController?.icon"
        :icon="windowController.icon"
      />

      <div v-if="windowController?.title" class="owd-window-nav__title">
        <div
          class="owd-window-nav__title-inner truncate"
          v-text="windowController?.title"
        />
      </div>
    </template>

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

  <ContextMenu ref="menu" :model="items" />
</template>

<style scoped lang="scss">
.owd-window-nav {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: space-between;
  width: 100%;
  min-height: var(--nova-window-nav-height, 32px);

  &__btn-group {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--nova-window-nav-gap, 2px);
    padding: 0;
    margin: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    padding-left: 6px;
    gap: var(--owd-gap, 4px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
