<script setup lang="ts">
const props = defineProps<{
  config?: WindowConfig
  window?: IWindowController
  content?: any
}>()
</script>

<template>
  <CoreWindow
      v-bind="$props"
      v-show="window?.state?.active ?? true"
  >
    <Card border rounded :pt:body="{class: 'p-0'}">
      <template #header>
        <WindowNav>

          <template v-slot:prepend>
            <slot name="nav-prepend"/>
          </template>

          <template v-slot:append>
            <slot name="nav-append"/>
          </template>

        </WindowNav>
      </template>
      <template #content>
        <WindowContent>

          <slot/>

        </WindowContent>
      </template>
    </Card>
  </CoreWindow>
</template>

<style scoped lang="scss">
.owd-window {
  border-width: 1px;
  border-style: solid;
  border-color: var(--owd-surface-700);
  border-radius: var(--owd-card-border-radius);
  background: var(--owd-surface-900);

  :deep(> .p-card) {
    height: 100%;
    backdrop-filter: blur(48px);
    border-radius: var(--owd-card-border-radius);
    overflow: hidden;

    > .p-card-header {
      flex: 0;
      height: var(--owd-system-bar-height);
    }

    > .p-card-body {
      flex: 1;
      height: calc(100% - var(--owd-system-bar-height));

      > .p-card-content {
        height: 100%;
      }
    }
  }
}
</style>