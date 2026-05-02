import type { useConfirm } from 'primevue/useconfirm'
import type {
  OwdConfirmDialogOptions,
  OwdDialogProvider,
} from '@owdproject/core/runtime/dialogs/owdDialogProvider'

export function createWin95OwdDialogs(
  confirm: ReturnType<typeof useConfirm>,
): OwdDialogProvider {
  return {
    confirm(opts: OwdConfirmDialogOptions): Promise<boolean> {
      return new Promise((resolve) => {
        const toTrash = opts.extras?.toTrash
        const message =
          typeof toTrash === 'boolean'
            ? { message: opts.message, toTrash }
            : opts.message

        confirm.require({
          group: 'delete',
          header: opts.title ?? '',
          message,
          acceptProps: { label: opts.acceptLabel ?? 'OK', width: 120 },
          rejectProps: { label: opts.rejectLabel ?? 'Cancel', width: 120 },
          accept: () => resolve(true),
          reject: () => resolve(false),
        })
      })
    },
    alert(message, options): Promise<void> {
      return new Promise((resolve) => {
        confirm.require({
          group: 'about',
          header: options?.title ?? '',
          message,
          acceptProps: { label: 'OK', class: 'p-button--primary' },
          rejectProps: { class: 'hidden' },
          accept: () => resolve(),
          reject: () => resolve(),
        })
      })
    },
    prompt(message, defaultValue = '') {
      if (import.meta.server) return Promise.resolve(null)
      const g = globalThis as typeof globalThis & {
        prompt?: (m?: string, d?: string) => string | null
      }
      const v =
        typeof g.prompt === 'function' ? g.prompt(message, defaultValue) : null
      return Promise.resolve(v === null ? null : v)
    },
  }
}
