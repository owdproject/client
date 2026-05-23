<script setup>
import { useSlots, computed, useAttrs } from "vue";
import Nav from "./Nav.vue";
import Body from "./Body.vue";
const props = defineProps({
  window: { type: Object, required: false },
  content: { type: null, required: false },
  chromePadding: { type: Boolean, required: false, default: true },
  frameClass: { type: String, required: false }
});
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const windowRootClass = computed(
  () => [attrs.class, props.frameClass].filter(Boolean)
);
const slots = useSlots();
const hasHeaderBelowNavSlot = computed(
  () => typeof slots["header-below-nav"] === "function"
);
const cardRootClass = computed(
  () => [
    "p-card--border",
    props.chromePadding === false ? "kit-fs-frame-card--tight" : ""
  ].filter(Boolean).join(" ")
);
</script>

<template>
  <CoreWindow
    :class="windowRootClass"
    :window="props.window"
    :content="props.content"
    v-show="props.window?.state?.active ?? true"
  >
    <Card :pt:root="cardRootClass">
      <template #header>
        <div class="kit-fs-frame__header-stack">
          <Nav>
            <template #prepend>
              <slot name="nav-prepend" />
            </template>
            <!-- Only forward nav-title when set; otherwise Nav keeps icon + window title (About, Todo, …). -->
            <template v-if="$slots['nav-title']" #title>
              <slot name="nav-title" />
            </template>
            <template #append>
              <slot name="nav-append" />
            </template>
          </Nav>
          <div
            v-if="hasHeaderBelowNavSlot"
            class="kit-fs-frame__header-below-nav"
          >
            <slot name="header-below-nav" />
          </div>
        </div>
      </template>
      <template #content>
        <Body>
          <slot />
        </Body>
      </template>
    </Card>
  </CoreWindow>
</template>

<style scoped>
.kit-fs-frame__header-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.kit-fs-frame__header-below-nav {
  min-width: 0;
}

.owd-window.resizable-component {
  box-sizing: border-box;
  display: inline-block;
  min-width: 160px;
  min-height: 160px;
  text-align: left;
  cursor: default;
  border-radius: var(--p-window-border-radius);
}
@media (max-width: 599px) {
  .owd-window.resizable-component {
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    max-width: 100vw;
    max-height: 100vh;
    height: 100vh !important;
    z-index: 9999999999 !important;
  }
}
.owd-window.resizable-component :deep(> .p-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--owd-gap);
}
.owd-window.resizable-component :deep(> .p-card).kit-fs-frame-card--tight {
  padding: 0;
}
.owd-window.resizable-component :deep(> .p-card).kit-fs-frame-card--tight > .p-card-header {
  margin-bottom: 0;
}
.owd-window.resizable-component :deep(> .p-card) > .p-card-header {
  margin-bottom: 2px;
  flex-shrink: 0;
}
.owd-window.resizable-component :deep(> .p-card) > .p-card-body {
  flex: 1;
  min-height: 0;
  height: auto;
}
.owd-window.resizable-component :deep(> .p-card) > .p-card-body > .p-card-content {
  height: 100%;
}
</style>
