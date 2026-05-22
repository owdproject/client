<script setup lang="ts">
import { ref } from 'vue'
import TieredMenu from 'primevue/tieredmenu'
import { useSystemBar } from '../../composables/useSystemBar'

const systemBar = useSystemBar()
const menu = ref<InstanceType<typeof TieredMenu> | null>(null)

const startMenuRowClass =
  'owd-system-bar__start__menu__row flex items-center box-border gap-2 px-2.5'

const startMenuPt = {
  root: { class: 'owd-system-bar__start__menu' },
  rootList: { class: 'owd-system-bar__start__menu__list' },
  item: { class: 'owd-system-bar__start__menu__item' },
  itemContent: { class: 'owd-system-bar__start__menu__item-content' },
  itemLink: { class: startMenuRowClass },
  submenu: { class: 'owd-system-bar__start__menu__submenu' },
  separator: { class: 'owd-system-bar__start__menu__separator' },
  transition: {
    enterActiveClass: '',
    enterFromClass: '',
    enterToClass: '',
    leaveActiveClass: '',
    leaveFromClass: '',
    leaveToClass: '',
  },
}

function toggleStartMenu(event: Event) {
  menu.value?.toggle(event)
}

function onMenuShow() {
  systemBar.opened.value = true
}

function onMenuHide() {
  systemBar.opened.value = false
}
</script>

<template>
  <div class="owd-system-bar__start">
    <Button
      class="owd-system-bar__start__button"
      aria-haspopup="true"
      :aria-expanded="systemBar.opened.value"
      :pt:root="[
        'p-button--system-bar p-button--system-bar-start',
        { 'p-button--active': systemBar.opened.value },
      ]"
      aria-controls="win95_start_menu"
      @click="toggleStartMenu"
    >
      <div class="owd-system-bar__start__button__icon" />
      {{ $t('systemBar.start.button.label') }}
    </Button>

    <TieredMenu
      id="win95_start_menu"
      ref="menu"
      popup
      :model="systemBar.menu.value"
      :pt="startMenuPt"
      @show="onMenuShow"
      @hide="onMenuHide"
    >
      <template #item="{ item, props: itemProps, hasSubmenu }">
        <a
          v-if="!item.separator"
          v-bind="itemProps.action"
          class="owd-system-bar__start__menu__link"
        >
          <img
            v-if="item.image"
            :src="item.image"
            alt=""
            class="owd-system-bar__start__menu__image"
          />
          <Icon
            v-else-if="item.icon"
            :name="item.icon"
            :size="21"
            class="owd-system-bar__start__menu__icon"
          />
          <span class="owd-system-bar__start__menu__label">{{ item.label }}</span>
          <Icon
            v-if="hasSubmenu"
            class="owd-system-bar__start__menu__arrow"
            name="mdi:menu-right"
            :size="21"
          />
        </a>
      </template>
    </TieredMenu>
  </div>
</template>

<style scoped lang="scss">
.owd-system-bar__start {
  position: relative;
  display: inline-block;
  height: 100%;
  vertical-align: top;

  &__button {
    height: 100%;
    min-height: calc(var(--owd-system-bar-height) - 2 * var(--owd-gap));

    &__icon {
      position: absolute;
      top: 50%;
      left: 2px;
      transform: translateY(-50%);
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAAEEfUpiAAAACXBIWXMAAAsSAAALEgHS3X78AAABnElEQVRYhe1W7XLDIAyzuLx30id3fwCOEXa+tt12u6qXNoArhCNMRAhL+9X+Xfyo0r1vBxwqIvAcEJ04mHeATbK4Hq1U9QZNqQXA2NDmQ8Z+E0vQ55WjpKNN5BTAmAKwP4k44AqilP8gOE8oMj2DQxmp57hfuaGBguzx4yCIlhCtwGtD9XpvYSI414Dvcuk/wiJ56j0ii0CkGglJAFkmJi26K1D6Y8xClAW1RPllQKxsnaOIiDoS0VpYL+/jpctHU4BdiVXSAdRReiWXJAecBW0SHQHgSPocuLqKUqmNJJjjGs58kF22ne3USchulbkPnuHXkupd0IXcLdtPxcME6L6Xh30cCFMisPbWflf6o0W8KDBabFKFjt42VPatO1x9LPy4jVg8ca9kVBJ9qbxdLs8QegBjBtW3kXhkzjAx94F1HG4CtBXE2QNwZQo0Ns7BM8CYRUReTeF2bPGwCp96ILZB84fOl2QecIv0R4I/Knjsy0jqgH+Fs8fTQ5Mkxi7o0VvrXskDGfh9ho/rqP3kuiwmuo+E3uH8nKl/A2+XwABg59RRoQAAAABJRU5ErkJggg==');
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

:global(.owd-system-bar__start__menu__link) {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: var(--owd-start-menu-row-height, 31px);
  min-height: var(--owd-start-menu-row-height, 31px);
  gap: 8px;
  width: 100%;
  text-decoration: none;
  color: inherit;
  line-height: 1.2;
}

:global(.owd-system-bar__start__menu__image) {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
  object-fit: contain;
}

:global(.owd-system-bar__start__menu__arrow) {
  margin-left: auto;
  flex-shrink: 0;
}
</style>
