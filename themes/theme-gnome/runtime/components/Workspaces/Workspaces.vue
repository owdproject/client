<script setup lang="ts">
import { Carousel, Slide } from 'vue3-carousel'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'
import { useWorkspaces } from '../../composables/useWorkspaces'

const applicationManager = useApplicationManager()
const desktopWorkspaceStore = useDesktopWorkspaceStore()
const workspaces = useWorkspaces()

function onWorkspaceWindowDragDrop(e: any, workspaceId: string) {
  e.preventDefault()

  const windowId = e.dataTransfer.getData('text')
  const window: IWindowController =
    applicationManager.getWindowOpenedId(windowId)

  window.actions.setWorkspace(workspaceId)
}

function onWorkspaceClick(workspaceId: string) {
  if (desktopWorkspaceStore.active !== workspaceId) {
    desktopWorkspaceStore.setWorkspace(workspaceId)
  } else {
    desktopWorkspaceStore.setOverview(false)
  }
}
</script>

<template>
  <div class="owd-desktop__workspace-container">
    <Carousel
      :model-value="desktopWorkspaceStore.workspaceActiveIndex"
      :items-to-show="1"
      snap-align="start"
      :mouse-drag="false"
      :enabled="workspaces?.enabled"
      :mouse-wheel="desktopWorkspaceStore.overview"
      :touch-drag="desktopWorkspaceStore.overview"
      @keydown.stop
    >
      <Slide
        v-for="(workspaceId, index) of desktopWorkspaceStore.list"
        :key="index"
        @click.native="onWorkspaceClick(workspaceId)"
        @drop="(e) => onWorkspaceWindowDragDrop(e, workspaceId)"
        @dragover="(e) => e.preventDefault()"
        class="owd-desktop__workspace"
      >
        <div
          class="owd-desktop__workspace-inner"
          :data-workspace-id="workspaceId"
        >
          <slot :workspace-id="workspaceId" />
        </div>
      </Slide>
    </Carousel>
  </div>
</template>

<style lang="scss">
.owd-desktop {
  .owd-desktop__workspace {
    border-radius: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: all 0.3s ease-in-out;
    will-change: transform;

    &-inner {
      width: 100%;
      height: 100%;
    }
  }

  .carousel {
    position: fixed;
    top: 0;
    width: 100vw;
    height: 100vh;

    &__slide {
      height: 100%;
    }
  }

  &--overview-enabled {
    .owd-desktop__workspace {
      border-radius: 48px;
      box-shadow: 0 0 32px 0 rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .carousel__slide--prev {
      transform: scale(0.6) translate(55%, 4vh) !important;
    }

    .carousel__slide--next {
      transform: scale(0.6) translate(-55%, 4vh) !important;
    }

    .carousel__slide {
      transform: scale(0.65) translateY(4vh);
    }
  }

  // dock

  .owd-dock-bar,
  .owd-desktop__search,
  .owd-desktop__workspace-previews {
    position: relative;
    transition: z-index 0s ease-in;
    transition-delay: 0s;
    z-index: 0;
  }

  &--overview-enabled {
    .owd-dock-bar,
    .owd-desktop__search,
    .owd-desktop__workspace-previews {
      transition-delay: 1s;
      z-index: 2;
    }
  }
}
</style>
