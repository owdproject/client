<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  window: Window
}>()

const { t } = useI18n()

const explorerMenu = [
  {
    label: t('apps.explorer.menu.file'),
    items: [
      {
        label: t('apps.explorer.action.newFolder'),
        command: () => {
          props.window.fsExplorer.createNewDirectory()
        },
      },
      { separator: true },
      {
        label: t('apps.explorer.action.delete'),
        command: () => {
          props.window.fsExplorer.fsController.deleteSelectedFiles()
        },
      },
      {
        label: t('apps.explorer.action.rename'),
        command: () => {},
      },
      {
        label: t('apps.explorer.action.properties'),
        command: () => {
          props.window.fsExplorer.fileProperties()
        },
      },
      { separator: true },
      {
        label: t('apps.explorer.action.close'),
        command: () => {
          props.window.destroy()
        },
      },
    ],
  },
  {
    label: t('apps.explorer.menu.edit'),
    items: [
      {
        label: t('apps.explorer.action.cut'),
        command: () => {
          props.window.fsExplorer.cutSelectedFiles()
        },
      },
      {
        label: t('apps.explorer.action.copy'),
        command: () => {
          props.window.fsExplorer.copySelectedFiles()
        },
      },
      {
        label: t('apps.explorer.action.paste'),
        command: () => {
          props.window.fsExplorer.fsController.pasteClipboardFiles()
        },
      },
      {
        label: t('apps.explorer.action.pasteShortcut'),
        command: () => {
          props.window.fsExplorer.pasteShortcuts()
        },
      },
      { separator: true },
      {
        label: t('apps.explorer.action.selectAll'),
        command: () => {
          props.window.fsExplorer.selectAllFiles()
        },
      },
      {
        label: t('apps.explorer.action.invertSelection'),
        command: () => {
          props.window.fsExplorer.invertSelection()
        },
      },
    ],
  },
  {
    label: t('apps.explorer.menu.view'),
    items: [
      {
        label: t('apps.explorer.layout.largeIcons'),
        command: () => props.window.fsExplorer.setLayout('largeIcons'),
      },
      {
        label: t('apps.explorer.layout.smallIcons'),
        command: () => props.window.fsExplorer.setLayout('smallIcons'),
      },
      {
        label: t('apps.explorer.layout.list'),
        command: () => props.window.fsExplorer.setLayout('list'),
      },
      {
        label: t('apps.explorer.layout.details'),
        command: () => props.window.fsExplorer.setLayout('details'),
      },
      { separator: true },
      {
        label: t('apps.explorer.action.refresh'),
        command: () => {
          props.window.fsExplorer.refreshDirectory()
        },
      },
    ],
  },
  {
    label: t('apps.explorer.menu.help'),
    items: [
      {
        label: t('apps.explorer.action.about'),
        command: () =>
          confirm.require({
            group: 'about',
            header: 'About',
            acceptProps: {
              label: 'OK',
              class: 'p-button--primary',
            },
            rejectProps: {
              class: 'hidden',
            },
            accept: () => {},
          }),
      },
    ],
  },
]

props.window.setMenu(explorerMenu)

const confirm = useConfirm()
</script>

<template>
  <WindowDirectory v-bind="$props" />

  <ConfirmDialog />

  <ConfirmDialog group="delete">
    <template #message="ctx">
      <div class="flex items-center space-x-3">
        <div class="text-yellow-500 mt-1">
          <img v-if="ctx.message.toTrash" src="data:image/gif;base64,R0lGODlhHQAgAMIGAAAAAAAA/wCAAICAgMDAwP///7KysrKysiH5BAEKAAcALAAAAAAdACAAAAPUeLo3/vCxSV25OJcB6HybJg5E51kXKmJDUVYptGZAXX9bdAV8z8ccXA40E5kWJAJw52sGLgAHkkBVuqxFDCCmSFYvBGcTSoU2qmgwdgUoFzpetDvsdOfg8rz6C3SY4lUDAgJ2fQ9HgASDi4pUERCIVIuEkowEj4dTlZSbjphBU5NVopeYR12KhJx5n6dng3mSno+uJLCjuKW0FYpJt4KzkCeyk5amw4HFgbsVDsmszBQ1zpfQwh4L04m6mdgM2nLR3tlRXuLj5M6Qrujf5Rzs7dI32AkAOw==" />
          <img v-else src="data:image/gif;base64,R0lGODlhIAAgAOMIAAAAAAAA//8AAICAAICAgMDAwP//AP///7KysrKysrKysrKysrKysrKysrKysrKysiH5BAEKAAgALAAAAAAgACAAAAT+EElEqq0z663J+eBHcOTmGQWqpmNZnmm8Gq3bFXiu61dvARlPaEgsggZACWwmazJVyInH6av2ClHlgSk0EgmALOVA9RYrgOSYa/4WwFLyrNsWkeHrJr0ufAOncyABg4SDQ2BpiUsxe3UhBQCAMl2FlZYBH5CLKI2OmZFyk4KXpJ8wOAYCqgKeQ5AFoauyAqSXpjGyH7kHex5TvLwEsDi7shU4F2TBvgeRCKnFucywv13CE7O6xsrTwNXPCNkH2czl3sjYs+rlb8DU7QUZ0aoI53cSvPVvNeGr2vS+KIxRIgWHBnX0CAYReGBCvg2y6gmcyE/giIo2MmqswVFhR4ICEQAAOw==" />
        </div>

        <div>
          {{ctx.message.message}}
        </div>
      </div>
    </template>
  </ConfirmDialog>

  <ConfirmDialog group="about">
    <template #message>
      <div>
        <p>
          Open Web Desktop (OWD) is a framework designed to provide<br />
          a simple environment for building web desktop experiences.
        </p>
        <p class="mt-2">
          <a
            href="https://github.com/owdproject/theme-win95"
            target="_blank"
          >
            github.com/owdproject/theme-win95
          </a>
        </p>
      </div>
    </template>
  </ConfirmDialog>
</template>
