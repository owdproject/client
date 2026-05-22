<script setup lang="ts">
import {demoDesktopProps} from "../../../consts/constsDesktop";
</script>

<template>
  <div class="owd-docs-wrapper owd-docs-wrapper--home">
    <Desktop
        v-bind="demoDesktopProps"
    >

      <DocsHeader/>

      <slot/>

    </Desktop>
  </div>
</template>

<style scoped lang="scss">

</style>