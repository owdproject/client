<script setup lang="ts">
defineProps<{
  iconPrepend?: string;
  iconAppend?: string;
}>()
</script>

<template>
  <div class="owd-system-bar__settings-menu__slider">
    <div v-if="iconPrepend" class="owd-system-bar__settings-menu__slider__icon-prepend">
      <Icon :name="iconPrepend" :size="20" />
    </div>
    <div class="owd-system-bar__settings-menu__slider__content">
      <slot />
    </div>
    <div v-if="iconAppend" class="owd-system-bar__settings-menu__slider__icon-append">
      <Icon :name="iconAppend" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.owd-system-bar__settings-menu__slider {
  display: flex;
  flex-direction: row;

  &__icon-prepend {
    flex: 0;
    padding-right: 16px;
  }

  &__icon-append {
    flex: 0;
    padding-left: 16px;
  }

  &__content {
    flex: 1;
    align-content: center;
  }

  .iconify {
    vertical-align: -3px;
  }
}
</style>