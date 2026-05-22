<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import type { IWindowController } from '@owdproject/core'
import { createExplorerWindowMenuItems } from '@owdproject/kit-explorer/runtime/composables/useExplorerWindowMenu'
import Win11ExplorerShell from '../explorer/Win11ExplorerShell.vue'

const props = defineProps<{
  window: IWindowController
}>()

const { t } = useI18n()
const confirm = useConfirm()

const explorerMenu = createExplorerWindowMenuItems(
  () => props.window,
  t,
  () =>
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
)

props.window.setMenu(explorerMenu)
</script>

<template>
  <Win11ExplorerShell v-bind="$props" :overflow-menu="explorerMenu" />

  <ConfirmDialog />

  <ConfirmDialog group="delete">
    <template #message="ctx">
      <div class="flex items-center space-x-3">
        <div class="text-yellow-500 mt-1">
          <img v-if="ctx.message.toTrash" src="data:image/gif;base64,R0lGODlhHQAgAMIGAAAAAAAA/wCAAICAgMDAwP///7KysrKysiH5BAEKAAcALAAAAAAdACAAAAPUeLo3/vCxSV25OJcB6HybJg5E51kXKmJDUVYptGZAXX9bdAV8z8ccXA40E5kWJAJw52sGLgAHkkBVuqxFDCCmSFYvBGcTSoU2qmgwdgUoFzpetDvsdOfg8rz6C3SY4lUDAgJ2fQ9HgASDi4pUERCIVIuEkowEj4dTlZSbjphBU5NVopeYR12KhJx5n6dng3mSno+uJLCjuKW0FYpJt4KzkCeyk5amw4HFgbsVDsmszBQ1zpfQwh4L04m6mdgM2nLR3tlRXuLj5M6Qrujf5Rzs7dI32AkAOw==" />
          <img v-else src="data:image/gif;base64,R0lGODlhIAAgAOMIAAAAAAAA//8AAICAAICAgMDAwP//AP///7KysrKysrKysrKysrKysrKysrKysrKysiH5BAEKAAgALAAAAAAgACAAAAT+EElEqq0z663J+eBHcOTmGQWqpmNZnmm8Gq3bFXiu61dvARlPaEgsggZACWwmazJVyInH6av2ClHlgSk0EgmALOVA9RYrgOSYa/4WwFLyrNsWkeHrJr0ufAOncyABg4SDQ2BpiUsxe3UhBQCAMl2FlZYBH5CLKI2OmZFyk4KXpJ8wOAYCqgKeQ5AFoauyAqSXpjGyH7kHex5TvLwEsDi7shU4F2TBvgeRCKnFucywv13CE7O6xsrTwNXPCNkH2czl3sjYs+rlb8DU7QUZ0aoI53cSvPVvNeGr2vS+KIxRIgWHBnX0CAYReGBCvg2y6gmcyE/giIo2MmqswVFhR4ICEQAAOw==" />
        </div>

        <div>
          {{ ctx.message.message }}
        </div>
      </div>
    </template>
  </ConfirmDialog>

  <ConfirmDialog group="about">
    <template #message>
      <div>
        <p>
          Windows 11 theme for OWD desktop clients.<br />
          Maintained by Diego Villa (<a href="https://github.com/dxlliv" target="_blank">@dxlliv</a>).
        </p>
        <p class="mt-2">
          <a href="https://github.com/dxlliv/theme-win11" target="_blank">
            github.com/dxlliv/theme-win11
          </a>
        </p>
      </div>
    </template>
  </ConfirmDialog>
</template>
