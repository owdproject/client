<script setup lang="ts">
import { useSystemBar } from '../../composables/useSystemBar'
import { useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const systemBar = useSystemBar()
const startButtonElement = useTemplateRef('startButtonElement')

function toggleStartMenu(event) {
  systemBar.opened.value = !systemBar.opened.value
}

onClickOutside(startButtonElement, () => {
  systemBar.opened.value = false
})
</script>

<template>
  <Button
    class="owd-system-bar__start__button"
    ref="startButtonElement"
    aria-haspopup="true"
    :pt:root="[
      'p-button__system-bar p-button__system-bar-start',
      { 'p-button--active': systemBar.opened.value },
    ]"
    aria-controls="overlay_menu"
    @click="toggleStartMenu"
  >
    <div class="owd-system-bar__start__button__icon" />
    {{ $t('systemBar.start.button.label') }}

    <TieredMenu
      v-if="systemBar.opened.value"
      class="owd-system-bar__start__menu"
      ref="startMenuElement"
      id="overlay_menu"
      :model="systemBar.menu.value"
      @click.stop
    >
      <template #itemicon="{ item }">
        <img v-if="item.image" :src="item.image" />
        <Icon v-if="item.icon" :name="item.icon" :size="21" />

        <template v-if="item.items">
          <Icon
            class="owd-system-bar__start__menu__arrow"
            name="mdi:menu-right" :size="24"
          />
        </template>
      </template>
    </TieredMenu>
  </Button>
</template>

<style scoped lang="scss">
.owd-system-bar__start {
  &__button {
    height: 100%;
    font-weight: bold;
    padding-left: 44px !important;
    overflow: inherit;

    &__icon {
      position: absolute;
      top: 50%;
      left: 2px;
      transform: translateY(-50%);
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAAEEfUpiAAAACXBIWXMAAAsSAAALEgHS3X78AAABnElEQVRYhe1W7XLDIAyzuLx30id3fwCOEXa+tt12u6qXNoArhCNMRAhL+9X+Xfyo0r1vBxwqIvAcEJ04mHeATbK4Hq1U9QZNqQXA2NDmQ8Z+E0vQ55WjpKNN5BTAmAKwP4k44AqilP8gOE8qMj2DQxmp57hfuaGBguzx4yCIlhCtwGtD9XpvYSI414Dvcuk/wiJ56j0ii0CkGglJAFkmJi26K1D6Y8xClAW1RPllQKxsnaOIiDoS0VpYL+/jpctHU4BdiVXSAdRReiWXJAecBW0SHQHgSPocuLqKUqmNJJjjGs58kF22ne3USchulbkPnuHXkupd0IXcLdtPxcME6L6Xh30cCFMisPbWflf6o0W8KDBabFKFjt42VPatO1x9LPy4jVg8ca9kVBJ9qbxdLs8QegBjBtW3kXhkzjAx94F1HG4CtBXE2QNwZQo0Ns7BM8CYRUReTeF2bPGwCp96ILZB84fOl2QecIv0R4I/Knjsy0jqgH+Fs8fTQ5Mkxi7o0VvrXskDGfh9ho/rqP3kuiwmuo+E3uH8nKl/A2+XwABg59RRoQAAAABJRU5ErkJggg==');
      background-position: 8px center;
      background-repeat: no-repeat;
      background-size: 24px;
      height: 22px;
      padding-left: 38px;
      padding-right: 8px;
      pointer-events: none;
    }
  }
}

:deep(.owd-system-bar__start__menu) {
  position: absolute;
  left: -2px;
  bottom: calc(var(--owd-system-bar-height) - 6px);
  font-weight: initial;
  padding: var(--owd-border-width);
  min-width: 280px;

  & > ul {
    border-left: 32px solid rgb(var(--owd-elevation-inactive));
  }

  .owd-system-bar__start__menu__arrow {
    position: absolute;
    margin-top: -3px;
    right: -8px;
  }
}
</style>
