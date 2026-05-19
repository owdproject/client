<script setup lang="ts">
const props = defineProps<{
  primary?: boolean
  bolded?: boolean
  disabled?: boolean
  active?: boolean
  size?: string
  icon?: boolean
}>()

const classes = computed(() => {
  const list = ['owd-button']

  if (props.primary) {
    list.push('owd-button--primary')
  }

  if (props.bolded) {
    list.push('owd-button--bolded')
  }

  if (props.disabled) {
    list.push('owd-button--disabled')
  }

  if (props.active) {
    list.push('owd-button--active')
  }

  if (props.size) {
    list.push(`owd-button--size-${props.size}`)
  }

  if (props.icon) {
    list.push('owd-button--icon')
  }

  return list
})
</script>

<template>
  <Card :class="classes">
    <slot />
  </Card>
</template>

<style scoped lang="scss">
.owd-button {
  position: relative;
  display: inline-block;
  min-width: 32px;
  height: 32px;
  line-height: 32px;
  text-align: center;
  font-size: 17px;
  border: 0;
  padding: 0;
  border: 1px solid #1b1b1b #1b1b1b #151515 #1b1b1b;

  &:active, &--active {
    :deep(.owd-button__icon) {
      margin-top: 2px;
    }
  }

  &:not(&--disabled) {
    cursor: pointer;
  }

  &--primary:before {
    left: 2px;
    top: 2px;
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    outline: var(--owd-win95-sheet-color) solid 2px;
  }

  &--bolded {
    font-weight: bold;
  }

  &--disabled {
    color: rgb(132, 133, 132);
    text-shadow: rgb(254, 254, 254) 1px 1px;
  }

  &:not(&--icon) {
    padding: 0 8px;
  }

  // system bar
  &--size-sb {
    height: 34px;
    line-height: 36px;
  }

  &--size-sm {
    min-width: 24px;
    height: 24px;
  }

  &--size-lg {
    min-width: 44px;
    height: 44px;
  }

  :deep(.iconify) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: black;
  }
}
</style>