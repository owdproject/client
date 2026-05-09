<script setup lang="ts">
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useI18n } from 'vue-i18n'
import { computed, TransitionGroup } from 'vue'

const applicationManager = useApplicationManager()
const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { t } = useI18n()

const openWindows = computed(() => {
  const raw = applicationManager.windowsOpened.value as unknown as Array<
    [string, IWindowController]
  >
  const out: IWindowController[] = []
  for (const pair of raw) {
    if (Array.isArray(pair) && pair.length >= 2) {
      out.push(pair[1])
    }
  }
  return out.sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', undefined, {
      sensitivity: 'base',
    }),
  )
})

function workspaceDesktopLabel(wsId: string) {
  const idx = desktopWorkspaceStore.list.indexOf(wsId)
  return idx >= 0 ? t('win11.start.desktopN', { n: idx + 1 }) : wsId
}

function focusWindow(win: IWindowController) {
  desktopWorkspaceStore.setWorkspace(win.state.workspace)
  win.actions.setActive(true)
  win.actions.bringToFront()
  desktopWorkspaceStore.setOverview(false)
}

function selectWorkspace(id: string) {
  desktopWorkspaceStore.setWorkspace(id)
}

function addDesktop() {
  desktopWorkspaceStore.createWorkspace()
}

function closeOverview() {
  desktopWorkspaceStore.setOverview(false)
}
</script>

<template>
  <div
    class="win11-task-view win11-task-view--open"
    role="dialog"
    aria-modal="true"
    :aria-label="t('win11.taskView.overlayAria')"
  >
    <div
      class="win11-task-view__backdrop"
      @click="closeOverview"
    />

    <div class="win11-task-view__content" @click.stop>
      <h2 class="win11-task-view__heading">
        {{ t('win11.taskView.openWindows') }}
      </h2>

      <div class="win11-task-view__grid-scroll">
        <TransitionGroup
          name="win11-task-view-tile"
          tag="div"
          class="win11-task-view__grid"
        >
          <button
            v-for="win in openWindows"
            :key="win.state.id"
            type="button"
            class="win11-task-view__tile"
            @click="focusWindow(win)"
          >
            <div class="win11-task-view__tile-head">
              <span class="win11-task-view__tile-icon" aria-hidden="true">
                <Icon
                  v-if="win.application.config.icon"
                  :name="win.application.config.icon"
                  size="20"
                />
                <span v-else class="win11-task-view__tile-fallback" />
              </span>
              <span class="win11-task-view__tile-title" :title="win.title">
                {{ win.title }}
              </span>
            </div>
            <span class="win11-task-view__tile-ws">
              {{ workspaceDesktopLabel(win.state.workspace) }}
            </span>
          </button>
        </TransitionGroup>

        <p
          v-if="openWindows.length === 0"
          class="win11-task-view__empty"
        >
          {{ t('win11.taskView.noOpenWindows') }}
        </p>
      </div>

      <div
        class="win11-task-view__desktops"
        :aria-label="t('win11.start.workspaces')"
      >
        <button
          v-for="(id, index) in desktopWorkspaceStore.list"
          :key="id"
          type="button"
          class="win11-task-view__desktop"
          :class="{
            'win11-task-view__desktop--active':
              id === desktopWorkspaceStore.active,
          }"
          @click="selectWorkspace(id)"
        >
          <span class="win11-task-view__desktop-label">
            {{ t('win11.start.desktopN', { n: index + 1 }) }}
          </span>
        </button>
        <button
          type="button"
          class="win11-task-view__desktop win11-task-view__desktop--add"
          :title="t('win11.start.addDesktop')"
          :aria-label="t('win11.start.addDesktop')"
          @click="addDesktop"
        >
          <span class="win11-task-view__desktop-add-icon">+</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.win11-task-view {
  position: fixed;
  z-index: 119900;
  left: 0;
  right: 0;
  top: 0;
  bottom: 48px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  pointer-events: none;
}

.win11-task-view__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 16, 0.65);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  pointer-events: auto;
}

.win11-task-view__content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 24px 16px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  pointer-events: none;
}

.win11-task-view__heading {
  flex-shrink: 0;
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(245, 245, 245, 0.92);
  pointer-events: auto;
}

.win11-task-view__grid-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 8px;
  pointer-events: auto;
}

.win11-task-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  align-content: start;
}

.win11-task-view__tile {
  text-align: left;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(20, 22, 28, 0.72);
  color: rgba(245, 245, 245, 0.96);
  padding: 12px 12px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 88px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  transition:
    transform 0.18s ease,
    opacity 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.win11-task-view--open .win11-task-view__tile {
  will-change: transform, opacity;
}

.win11-task-view__tile:hover,
.win11-task-view__tile:focus-visible {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 10px 32px rgba(0, 0, 0, 0.35);
  transform: scale(1.01);
  outline: none;
}

.win11-task-view__tile-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.win11-task-view__tile-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.win11-task-view__tile-fallback {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.35);
}

.win11-task-view__tile-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.win11-task-view__tile-ws {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: rgba(245, 245, 245, 0.55);
  text-transform: uppercase;
}

.win11-task-view__empty {
  margin: 24px 0;
  text-align: center;
  font-size: 14px;
  color: rgba(245, 245, 245, 0.55);
}

.win11-task-view__desktops {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: stretch;
  justify-content: center;
  padding: 14px 8px 4px;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

.win11-task-view__desktop {
  min-width: 120px;
  max-width: 180px;
  flex: 1 1 120px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.14);
  background: rgba(18, 18, 22, 0.65);
  color: rgba(245, 245, 245, 0.92);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.win11-task-view__desktop:hover,
.win11-task-view__desktop:focus-visible {
  border-color: rgba(255, 255, 255, 0.28);
  outline: none;
}

.win11-task-view__desktop--active {
  border-color: rgba(80, 160, 255, 0.85);
  box-shadow: 0 0 0 1px rgba(80, 160, 255, 0.35);
}

.win11-task-view__desktop--add {
  flex: 0 0 auto;
  min-width: 52px;
  max-width: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  opacity: 0.92;
}

.win11-task-view__desktop-add-icon {
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
}

.win11-task-view__desktop-label {
  display: block;
  text-align: center;
}

/* TransitionGroup tiles */
.win11-task-view-tile-enter-active,
.win11-task-view-tile-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.win11-task-view-tile-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.win11-task-view-tile-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.win11-task-view-tile-move {
  transition: transform 0.18s ease;
}
</style>
