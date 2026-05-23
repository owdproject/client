<template>
  <div class="explorer-chrome-band-base" data-part="chrome-band-root">
    <div class="explorer-chrome-band-base__nav" data-part="chrome-band-nav">
      <slot name="nav" />
    </div>

    <div class="explorer-chrome-band-base__crumb" data-part="chrome-band-crumb">
      <slot name="breadcrumb" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.explorer-chrome-band-base {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.explorer-chrome-band-base__nav {
  flex: 0 0 auto;
}

.explorer-chrome-band-base__crumb {
  flex: 1;
  min-width: 0;
}
</style>
