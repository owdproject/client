<script setup lang="ts">
import { useSystemBar } from '../../composables/useSystemBar'
import { computed } from '@vue/reactivity'

const systemBar = useSystemBar()

const classes = computed(() => {
  const list = ['owd-desktop__system-bar p-card--border']

  if (systemBar.position.value) {
    list.push(
      'owd-desktop__system-bar--position',
      `owd-desktop__system-bar--position-${systemBar.position.value}`,
    )
  }

  return list
})
</script>

<template>
  <Card :class="classes">
    <template #content>
      <div>
        <SystemBarButtonStart v-if="systemBar.startButton.value" />

        <Divider layout="vertical" type="solid" />

        <SystemBarWindows />
      </div>

      <div>
        <Card class="p-card--inset">
          <template #content>
            <CoreTime />
          </template>
        </Card>
      </div>
    </template>
  </Card>
</template>

<style scoped lang="scss">
.owd-desktop__system-bar {
  position: relative;
  height: var(--owd-system-bar-height);
  padding: var(--owd-gap);
  z-index: 999999999;

  :deep(> .p-card-body) {
    height: 100%;

    > .p-card-content {
      display: flex;
      flex-direction: row;
      height: 100%;

      > div {
        // system bar start button + windows

        &:nth-child(1) {
          flex: 1;

          .p-divider-vertical {
            display: inline-block;
            vertical-align: top;
          }

          .p-button--system-bar {
            height: 100%;
            margin-right: var(--owd-gap);
          }
        }

        // system bar right box

        &:nth-child(2) {
          .p-card--inset {
            height: 100%;
            padding: 0 6px;

            .p-card-body {
              padding: 0 8px;
              height: 100%;

              .p-card-content {
                display: flex;
                align-items: center;
                height: 100%;
              }
            }
          }
        }
      }
    }
  }

  // system bar position

  &--position {
    position: fixed;

    &-top,
    &-bottom {
      width: 100%;
    }

    &-top {
      top: 0;
    }

    &-bottom {
      bottom: 0;
    }
  }
}
</style>
