/** Neutral menu model for window chrome (Menubar-compatible shape). */
export interface DesktopMenuItem {
  label?: string
  icon?: string
  command?: () => void
  separator?: boolean
  disabled?: boolean
  items?: DesktopMenuItem[]
  [key: string]: unknown
}
