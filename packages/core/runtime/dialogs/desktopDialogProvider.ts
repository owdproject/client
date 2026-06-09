/** Options for a yes/no confirmation (theme renders labels and chrome). */
export interface DesktopConfirmDialogOptions {
  title?: string
  message: string
  danger?: boolean
  acceptLabel?: string
  rejectLabel?: string
  /**
   * Theme-specific payload (e.g. delete dialog passes `toTrash` for slot templates).
   */
  extras?: Record<string, unknown>
}

/**
 * Cross-theme dialog API. Themes implement with PrimeVue, native dialogs, etc.
 * Callers pass user-facing strings (usually from i18n); implementations only render.
 */
export interface DesktopDialogProvider {
  confirm(options: DesktopConfirmDialogOptions): Promise<boolean>
  alert(message: string, options?: { title?: string }): Promise<void>
  prompt(message: string, defaultValue?: string): Promise<string | null>
}

function browserGlobals(): {
  confirm: (message?: string) => boolean
  alert: (message?: string) => void
  prompt: (message?: string, defaultText?: string) => string | null
} | null {
  const g = globalThis as typeof globalThis & {
    confirm?: (message?: string) => boolean
    alert?: (message?: string) => void
    prompt?: (message?: string, defaultText?: string) => string | null
  }
  if (typeof g.confirm !== 'function') return null
  return {
    confirm: g.confirm.bind(g),
    alert:
      typeof g.alert === 'function'
        ? g.alert.bind(g)
        : (m?: string) => {
            void m
          },
    prompt:
      typeof g.prompt === 'function'
        ? g.prompt.bind(g)
        : () => null,
  }
}

export function createBrowserFallbackDialogProvider(): DesktopDialogProvider {
  return {
    async confirm(opts) {
      if (import.meta.server) return false
      const w = browserGlobals()
      if (!w) return false
      const text = [opts.title, opts.message].filter(Boolean).join('\n\n')
      return w.confirm(text)
    },
    async alert(message, opts) {
      if (import.meta.server) return
      const w = browserGlobals()
      if (!w) return
      w.alert([opts?.title, message].filter(Boolean).join('\n\n'))
    },
    async prompt(message, defaultValue = '') {
      if (import.meta.server) return null
      const w = browserGlobals()
      if (!w) return null
      const v = w.prompt(message, defaultValue)
      return v === null ? null : v
    },
  }
}
