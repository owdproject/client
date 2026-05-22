<template>
  <ButtonWindowNav size="small">
    <div class="owd-button__icon" />
  </ButtonWindowNav>
</template>

<style scoped lang="scss">
.owd-button__icon {
  width: 12px;
  height: 12px;
  top: 50%;
  left: 50%;
  margin-left: -1px;
  margin-top: -10px;
  transform: translateX(-50%) translateY(-50%) rotateZ(45deg);
  position: relative;

  &:before,
  &:after {
    position: absolute;
    background: rgb(var(--owd-theme-color-black));
    content: '';
  }

  &:before {
    height: 100%;
    width: 2px;
    left: 50%;
    transform: translateX(-50%);
  }

  &:after {
    height: 2px;
    width: 100%;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>
