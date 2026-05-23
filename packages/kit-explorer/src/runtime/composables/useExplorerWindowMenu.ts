import type { IWindowController } from '@owdproject/core'
import type { MenuItem } from 'primevue/menuitem'

export type ExplorerWindowMenuT = (
  key: string,
  values?: Record<string, unknown>,
) => string

/** PrimeVue menubar model shared by themed explorers and `app-explorer`. */
export function createExplorerWindowMenuItems(
  getWindow: () => IWindowController,
  t: ExplorerWindowMenuT,
  onAbout: () => void,
): MenuItem[] {
  const wx = () => getWindow()
  return [
    {
      label: t('apps.explorer.menu.file'),
      items: [
        {
          label: t('apps.explorer.action.newFolder'),
          command: () => {
            wx().fsExplorer.createNewDirectory()
          },
        },
        { separator: true },
        {
          label: t('apps.explorer.action.delete'),
          command: () => {
            wx().fsExplorer.fsController.deleteSelectedFiles()
          },
        },
        {
          label: t('apps.explorer.action.rename'),
          command: () => {},
        },
        {
          label: t('apps.explorer.action.properties'),
          command: () => {
            wx().fsExplorer.fileProperties()
          },
        },
        { separator: true },
        {
          label: t('apps.explorer.action.close'),
          command: () => {
            wx().destroy()
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
            wx().fsExplorer.cutSelectedFiles()
          },
        },
        {
          label: t('apps.explorer.action.copy'),
          command: () => {
            wx().fsExplorer.copySelectedFiles()
          },
        },
        {
          label: t('apps.explorer.action.paste'),
          command: () => {
            wx().fsExplorer.fsController.pasteClipboardFiles()
          },
        },
        {
          label: t('apps.explorer.action.pasteShortcut'),
          command: () => {
            wx().fsExplorer.pasteShortcuts()
          },
        },
        { separator: true },
        {
          label: t('apps.explorer.action.selectAll'),
          command: () => {
            wx().fsExplorer.selectAllFiles()
          },
        },
        {
          label: t('apps.explorer.action.invertSelection'),
          command: () => {
            wx().fsExplorer.invertSelection()
          },
        },
      ],
    },
    {
      label: t('apps.explorer.menu.view'),
      items: [
        {
          label: t('apps.explorer.layout.largeIcons'),
          command: () => wx().fsExplorer.setLayout('largeIcons'),
        },
        {
          label: t('apps.explorer.layout.smallIcons'),
          command: () => wx().fsExplorer.setLayout('smallIcons'),
        },
        {
          label: t('apps.explorer.layout.list'),
          command: () => wx().fsExplorer.setLayout('list'),
        },
        {
          label: t('apps.explorer.layout.details'),
          command: () => wx().fsExplorer.setLayout('details'),
        },
        { separator: true },
        {
          label: t('apps.explorer.action.refresh'),
          command: () => {
            wx().fsExplorer.refreshDirectory()
          },
        },
      ],
    },
    {
      label: t('apps.explorer.menu.help'),
      items: [
        {
          label: t('apps.explorer.action.about'),
          command: onAbout,
        },
      ],
    },
  ]
}
