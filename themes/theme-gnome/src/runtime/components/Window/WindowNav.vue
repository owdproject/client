<script setup lang="ts">
import { inject } from 'vue'

const windowController = inject<IWindowController>('windowController')

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
    <div
      v-if="$slots.prepend"
      class="owd-window-nav__btn-group owd-window-nav__btn-group--append"
    >
      <slot name="prepend" />
    </div>

    <div v-if="windowController?.title" class="owd-window-nav__title">
      <div
        class="owd-window-nav__title-inner text-ellipsis"
        v-text="windowController?.title"
      />
    </div>

    <div class="owd-window-nav__btn-group owd-window-nav__btn-group--append">
      <slot name="append" />

      <ButtonWindowNavClose
        v-if="!windowController?.instanced || windowController?.isDestroyable"
        @click="onWindowNavDestroy"
      />
    </div>
  </CoreWindowNav>
</template>

<style scoped lang="scss">
.owd-window-nav {
  display: flex;
  align-items: center;
  flex-shrink: 1;
  width: 100%;
  height: 35px;
  line-height: 35px;
  font-weight: bold;
  background: #353535;
  box-shadow:
    inset 0 1px 0 0 #383838,
    0 1px 0 0 #202020;
  border-radius: var(--p-window-border-radius) var(--p-window-border-radius) 0 0;
  text-align: center;

  &--focused {
    background: linear-gradient(to bottom, #2b2b2b, #262626);
    box-shadow:
      inset 0 1px 0 0 #383838,
      0 1px 0 0 #070707;
  }

  &__btn-group {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    padding: 0 7px;
  }

  &__title {
    display: flex;
    align-items: center;
    text-align: center;
    padding-left: 8px;
    gap: 4px;
    flex-grow: 1;

    &-inner {
      margin: 0 auto;
    }
  }

  .owd-window-nav__draggable {
    width: 100%;
    height: 100%;
  }
}
</style>
