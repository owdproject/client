import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopDefaultAppsStore } from '@owdproject/core/runtime/stores/storeDesktopDefaultApps'
import { shellEscape } from '@owdproject/core/runtime/utils/utilTerminal'
import { getAppByFilename, getFilename } from './utilFileSystem'

/** Open a VFS file with the configured default app for its extension. */
export async function openVfsFile(absolutePath: string): Promise<boolean> {
  const fileName = getFilename(absolutePath) || absolutePath
  const appRequired = getAppByFilename(fileName)
  if (!appRequired) return false

  const desktopDefaultAppsStore = useDesktopDefaultAppsStore()
  const defaultApp = desktopDefaultAppsStore.getDefaultApp(appRequired)
  if (!defaultApp) return false

  const applicationManager = useApplicationManager()
  const pathArg = shellEscape(absolutePath)
  await applicationManager.launchAppEntry(
    defaultApp.applicationId,
    defaultApp.entry,
    `'${pathArg}' --autoplay`,
  )
  return true
}
