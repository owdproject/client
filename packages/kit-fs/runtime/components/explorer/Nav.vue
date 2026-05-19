<script setup lang="ts">
import { inject, useSlots, computed } from 'vue'
import NavIcon from './NavIcon.vue'
import Minimize from './button/Minimize.vue'
import Maximize from './button/Maximize.vue'
import Close from './button/Close.vue'

import type { IWindowController } from '@owdproject/core'

const windowController = inject<IWindowController>('windowController')
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
  <CoreWindowNav @dblclick="onWindowMaximize">
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

      <Minimize
        v-if="!windowController?.instanced || windowController?.isMinimizable"
        @mousedown.stop
        @click.stop="onWindowMinimize"
      />
      <Maximize
        v-if="windowController?.isMaximizable"
        @mousedown.stop
        @click.stop="onWindowMaximize"
      />
      <Close
        v-if="!windowController?.instanced || windowController?.isDestroyable"
        @mousedown.stop
        @click.stop="onWindowNavDestroy"
      />
    </div>
  </CoreWindowNav>
</template>

<style scoped lang="scss">
.owd-window-nav {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: space-between;
  height: var(--owd-windov-nav-height);
  font-weight: bold;
  background: rgb(var(--owd-elevation-inactive));
  color: rgb(var(--owd-theme-color-light));

  &--focused {
    background: rgb(var(--owd-elevation-active-background));
    color: rgb(var(--owd-elevation-active-color));
  }

  &__btn-group {
    display: flex;
    gap: var(--owd-gap);
    padding: var(--owd-gap);
    margin-right: -1px;
  }

  &__title {
    display: flex;
    align-items: center;
    padding-left: 6px;
    gap: var(--owd-gap);
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .owd-window-nav__draggable {
    width: 100%;
    height: 100%;
  }
}
</style>
