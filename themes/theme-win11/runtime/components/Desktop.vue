<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, Transition } from 'vue'
import { useNow } from '@vueuse/core'
import { useAppConfig } from 'nuxt/app'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopStore } from '@owdproject/core/runtime/stores/storeDesktop'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useDesktopSession } from '@owdproject/kit-theme/runtime/composables/useDesktopSession'
import { useBlockNonInputContextMenu } from '@owdproject/kit-theme/runtime/composables/useBlockNonInputContextMenu'
import { useI18n } from 'vue-i18n'

const appConfig = useAppConfig()
const applicationManager = useApplicationManager()
const desktopStore = useDesktopStore()
const desktopWorkspaceStore = useDesktopWorkspaceStore()
const { shuttingDown } = useDesktopSession()
const { t } = useI18n()

const workspacesEnabled = computed(
  () =>
    (appConfig.desktop as { workspaces?: { enabled?: boolean } })?.workspaces
      ?.enabled,
)

const personalization = computed(() => desktopStore.state.personalization)
const shellClassList = computed(() => ({
  'win11-personalization-window-solid':
    personalization.value.windowSurface === 'solid',
  'win11-personalization-appearance-light':
    personalization.value.appearance === 'light',
  'win11-personalization-appearance-dark':
    personalization.value.appearance === 'dark',
}))
const shellStyle = computed(() => ({
  '--win11-window-tint': personalization.value.windowTint,
}))

useBlockNonInputContextMenu()

const now = useNow({ interval: 1000 })
const clockTime = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(now.value),
)
const clockDate = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now.value),
)

const startMenuOpen = ref(false)

/** Running apps with at least one window on the active workspace (taskbar). */
const taskbarApps = computed(() => {
  const wid = String(desktopWorkspaceStore.active ?? '')
  return applicationManager.appsRunning.value.filter((app) => {
    for (const [, w] of app.windows) {
      if (!wid) return true
      if (w.state.workspace === wid) return true
    }
    return false
  })
})

function openExplorer() {
  void applicationManager.launchAppEntry(
    'org.owdproject.explorer',
    'explorer',
    '/',
  )
}

function toggleStart() {
  startMenuOpen.value = !startMenuOpen.value
}

function openSearchLikeStart() {
  startMenuOpen.value = true
}

function focusTaskbarApp(app: IApplicationController) {
  const last = [...app.windows.entries()].pop()
  if (!last) return
  const [, win] = last
  desktopWorkspaceStore.setWorkspace(win.state.workspace)
  win.actions.bringToFront()
}

function toggleOverview() {
  desktopWorkspaceStore.setOverview(!desktopWorkspaceStore.overview)
}

function onWorkspaceDragOver(e: DragEvent) {
  if (!desktopWorkspaceStore.overview) return
  e.preventDefault()
}

function onWorkspaceDrop(e: DragEvent, workspaceId: string) {
  e.preventDefault()
  const raw =
    e.dataTransfer?.getData('text/plain') ||
    e.dataTransfer?.getData('text') ||
    ''
  if (!raw) return
  const win = applicationManager.getWindowOpenedId(raw)
  win?.actions.setWorkspace(workspaceId)
}

function onWorkspacePanelClick(workspaceId: string, e: MouseEvent) {
  if (!desktopWorkspaceStore.overview) return
  const target = e.target as HTMLElement | null
  if (target?.closest('.owd-window')) return
  desktopWorkspaceStore.setWorkspace(workspaceId)
  desktopWorkspaceStore.setOverview(false)
}

function onEscapeCloseOverview(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!desktopWorkspaceStore.overview) return
  desktopWorkspaceStore.setOverview(false)
}

onMounted(() =>
  typeof window !== 'undefined'
    ? window.addEventListener('keydown', onEscapeCloseOverview)
    : undefined,
)
onUnmounted(() =>
  typeof window !== 'undefined'
    ? window.removeEventListener('keydown', onEscapeCloseOverview)
    : undefined,
)
</script>

<template>
  <CoreDesktop v-bind="$props" :class="shellClassList" :style="shellStyle">
    <div class="win11-shell">
      <div class="win11-shell__workspace flex-1 min-h-0 relative">
        <CoreBackground />
        <div class="win11-shell__bloom" aria-hidden="true" />

        <DesktopContent>
          <slot />
        </DesktopContent>

        <div
          v-if="workspacesEnabled"
          class="win11-workspace-stack"
          :class="{
            'win11-workspace-stack--overview': desktopWorkspaceStore.overview,
          }"
        >
          <div
            v-for="(wsId, wsIndex) in desktopWorkspaceStore.list"
            :key="wsId"
            class="win11-workspace-panel"
            :class="{
              'win11-workspace-panel--active':
                wsId === desktopWorkspaceStore.active,
            }"
            @drop="onWorkspaceDrop($event, wsId)"
            @dragover="onWorkspaceDragOver"
            @click="onWorkspacePanelClick(wsId, $event)"
          >
            <span class="win11-workspace-panel__label">{{
              t('win11.start.desktopN', { n: wsIndex + 1 })
            }}</span>
            <div class="win11-workspace-panel__inner">
              <CoreApplicationRender :workspace-filter="wsId" />
            </div>
          </div>
        </div>
        <div
          v-else
          class="win11-shell__windows"
        >
          <CoreApplicationRender :workspace-filter="desktopWorkspaceStore.active" />
        </div>
      </div>

      <Win11StartMenu :open="startMenuOpen" @close="startMenuOpen = false" />

      <nav class="win11-dock win11-dock--fixed" aria-label="Taskbar">
        <!-- Balances the tray column so Start + pins + apps + search stay viewport-centered -->
        <div class="win11-dock__lead" aria-hidden="true" />

        <div class="win11-dock__center-cluster">
          <button
            type="button"
            class="win11-dock__icon win11-dock__icon--start"
            :aria-expanded="startMenuOpen"
            aria-controls="win11-start-dialog"
            :class="{ 'win11-dock__icon--active': startMenuOpen }"
            @click="toggleStart"
          >
            <svg color="#00ADEF" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M0 0h11.377v11.372H0Zm12.623 0H24v11.372H12.623ZM0 12.623h11.377V24H0Zm12.623 0H24V24H12.623"/></svg>
            <span class="sr-only">{{ $t('systemBar.start.button.label') }}</span>
          </button>
          <button
            type="button"
            class="win11-dock__icon"
            aria-label="File Explorer"
            @click="openExplorer"
          >
            <span class="win11-dock__explorer-icon" aria-hidden="true" />
          </button>
          <button
            v-if="workspacesEnabled"
            type="button"
            class="win11-dock__icon win11-dock__icon--taskview"
            :aria-pressed="desktopWorkspaceStore.overview"
            :aria-label="t('win11.taskbar.taskView')"
            :class="{ 'win11-dock__icon--active': desktopWorkspaceStore.overview }"
            @click="toggleOverview"
          >
            <span class="win11-dock__taskview-glyph" aria-hidden="true">
              <span class="win11-dock__taskview-glyph__back" />
              <span class="win11-dock__taskview-glyph__front" />
            </span>
          </button>

          <div
            class="win11-dock__segment win11-dock__segment--apps"
            role="toolbar"
            :aria-label="$t('win11.taskbar.runningApps')"
          >
            <button
              v-for="app in taskbarApps"
              :key="app.id"
              type="button"
              class="win11-dock__app"
              :title="app.config.title"
              @click="focusTaskbarApp(app)"
            >
              <Icon
                v-if="app.config.icon"
                :name="app.config.icon"
                size="22"
              />
              <span
                v-else
                class="win11-dock__app-fallback"
                aria-hidden="true"
              />
            </button>
          </div>

          <button
            type="button"
            class="win11-dock__icon"
            :aria-label="$t('win11.taskbar.search')"
            @click="openSearchLikeStart"
          >
            <img src="/search.webp" class="flipped" alt="" />
          </button>
        </div>

        <div class="win11-dock__segment win11-dock__segment--end">
          <div class="win11-dock__tray" role="group" :aria-label="$t('win11.taskbar.tray')">
            <button type="button" class="win11-dock__tray-btn" :aria-label="t('win11.taskbar.wifi')">
              <Icon name="mdi:wifi" size="18" />
            </button>
            <button type="button" class="win11-dock__tray-btn" :aria-label="t('win11.taskbar.volume')">
              <Icon name="mdi:volume-high" size="18" />
            </button>
            <button type="button" class="win11-dock__tray-btn" :aria-label="t('win11.taskbar.battery')">
              <Icon name="mdi:battery" size="18" />
            </button>
          </div>
          <div class="win11-dock__clock" aria-live="polite">
            <span class="win11-dock__clock-time">{{ clockTime }}</span>
            <span class="win11-dock__clock-date">{{ clockDate }}</span>
          </div>
        </div>
      </nav>
    </div>

    <DesktopShutdown :active="shuttingDown" />
  </CoreDesktop>
</template>

<style lang="scss">
@use '../assets/styles/index.scss';

.owd-desktop {
  font-family: var(--owd-font-family), system-ui, sans-serif;

  button {
    font-family: inherit;
  }
}
</style>

<style scoped lang="scss">
.win11-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: 48px;
  box-sizing: border-box;
}

.win11-shell__bloom {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: url('https://winblogs.thesourcemediaassets.com/sites/2/2021/10/Windows-11-Bloom-Screensaver-Dark-1600x900.jpg');
  background-size: cover;
  background-position: center;
}

.win11-shell__windows {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.win11-shell__windows :deep(.owd-window) {
  pointer-events: auto;
}

.win11-workspace-stack {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.win11-workspace-stack :deep(.owd-window) {
  pointer-events: auto;
}

.win11-workspace-panel {
  position: absolute;
  inset: 0;
  transform: translateZ(0);
  overflow: hidden;
  pointer-events: none;
}

.win11-workspace-stack:not(.win11-workspace-stack--overview)
  .win11-workspace-panel--active {
  pointer-events: auto;
  z-index: 2;
}

.win11-workspace-stack:not(.win11-workspace-stack--overview)
  .win11-workspace-panel:not(.win11-workspace-panel--active) {
  visibility: hidden;
  opacity: 0;
}

.win11-workspace-panel__inner {
  width: 100%;
  height: 100%;
}

.win11-workspace-panel__label {
  display: none;
}

.win11-task-view-shell-enter-active,
.win11-task-view-shell-leave-active {
  transition: opacity 0.18s ease;
}

.win11-task-view-shell-enter-from,
.win11-task-view-shell-leave-to {
  opacity: 0;
}

.win11-dock__taskview-glyph {
  position: relative;
  width: 22px;
  height: 18px;
  display: inline-block;
}

.win11-dock__taskview-glyph__back {
  position: absolute;
  left: 0;
  top: 2px;
  width: 16px;
  height: 14px;
  border-radius: 2px;
  background: rgba(190, 190, 190, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

.win11-dock__taskview-glyph__front {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 14px;
  border-radius: 2px;
  background: rgba(22, 22, 24, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-sizing: border-box;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
}

.win11-dock__icon--taskview.win11-dock__icon--active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.12);
}

.win11-dock--fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120000;
  flex-shrink: 0;
}

.win11-dock {
  height: 48px;
  line-height: 1;
  padding: 0 10px 0 12px;
  backdrop-filter: blur(64px);
  border-top: 1px solid var(--win11-shell-border, rgba(66, 66, 66, 0.2));
  background-color: var(--win11-shell-surface, rgba(27, 27, 27, 0.82));
  display: flex;
  align-items: center;
  gap: 0;
}

/* Same flex basis as the tray column → cluster stays horizontally centered */
.win11-dock__lead {
  flex: 1 1 0;
  min-width: 0;
}

.win11-dock__center-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(92vw, 1400px);
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.win11-dock__center-cluster::-webkit-scrollbar {
  display: none;
}

.win11-dock__segment--end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1 1 0;
  min-width: 0;
}

.win11-dock__tray {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  border-left: 1px solid color-mix(in srgb, var(--win11-shell-text, #fff) 16%, transparent);
  margin-left: 4px;
}

.win11-dock__tray-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: color-mix(in srgb, var(--win11-shell-text, #fff) 95%, transparent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.win11-dock__tray-btn:hover {
  background: color-mix(in srgb, var(--win11-shell-text, #fff) 10%, transparent);
}

.win11-dock__clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  min-width: 72px;
  padding-left: 8px;
  margin-left: 4px;
  border-left: 1px solid color-mix(in srgb, var(--win11-shell-text, #fff) 16%, transparent);
  font-variant-numeric: tabular-nums;
  color: var(--win11-shell-text, rgba(255, 255, 255, 0.92));
  user-select: none;
}

.win11-dock__clock-time {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.15;
}

.win11-dock__clock-date {
  font-size: 10px;
  font-weight: 400;
  color: var(--win11-shell-muted, rgba(255, 255, 255, 0.55));
  line-height: 1.2;
}

.win11-dock__segment {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.win11-dock__segment--apps {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.win11-dock__segment--apps::-webkit-scrollbar {
  display: none;
}

.win11-dock__app {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin: 0 2px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  transition:
    background 0.15s,
    border 0.15s;
}

.win11-dock__app:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.08);
}

.win11-dock__app-fallback {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
}

.win11-dock__icon {
  margin: 6px 3px;
  border-radius: 3px;
  transition:
    background 0.15s,
    border 0.15s;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.02px solid transparent;
  background: transparent;
  cursor: pointer;
}

.win11-dock__icon:hover {
  background: rgba(255, 255, 255, 0.05);
  border: 0.02px solid rgba(255, 255, 255, 0.07);
}

.win11-dock__icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  transition:
    width 0.1s,
    height 0.1s;
}

.win11-dock__icon img.flipped {
  transform: scaleX(-1);
}

.win11-dock__icon:active img {
  width: 20px;
  height: 20px;
}

.win11-dock__icon--start.win11-dock__icon--active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.12);
}

.win11-dock__win-logo {
  display: block;
  width: 22px;
  height: 22px;
  background: no-repeat center / contain
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 88 88'%3E%3Cpath fill='%23f25022' d='M0 0h42v42H0z'/%3E%3Cpath fill='%237fba00' d='M46 0h42v42H46z'/%3E%3Cpath fill='%2300a4ef' d='M0 46h42v42H0z'/%3E%3Cpath fill='%23ffb900' d='M46 46h42v42H46z'/%3E%3C/svg%3E");
}

.win11-dock__explorer-icon {
  display: block;
  width: 24px;
  height: 24px;
  background: no-repeat center / contain
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e0e0e0'%3E%3Cpath d='M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'/%3E%3C/svg%3E");
}
</style>
