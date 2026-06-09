import type { InjectionKey } from 'vue'
import type { DesktopDialogProvider } from '../dialogs/desktopDialogProvider'

export type DesktopToggleWindowMaximizeFn = (
  win: IWindowController | undefined,
) => boolean

export const DESKTOP_DIALOG_PROVIDER_KEY: InjectionKey<DesktopDialogProvider> =
  Symbol('desktop-dialog-provider')

export const DESKTOP_TOGGLE_WINDOW_MAXIMIZE_KEY: InjectionKey<DesktopToggleWindowMaximizeFn> =
  Symbol('desktop-toggle-window-maximize')
