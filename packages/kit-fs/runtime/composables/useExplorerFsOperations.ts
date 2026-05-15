import { useOwdDialogs } from '@owdproject/core/runtime/composables/useOwdDialogs'
import { explorerEntryAbsolutePath } from '@owdproject/core/runtime/utils/explorerEntryPath'

/**
 * Pass this factory as the second argument to {@link useFileSystemExplorer} (`module-fs`).
 * Uses {@link useOwdDialogs} and i18n keys `apps.explorer.*` for destructive operations.
 */
export default function createExplorerFsOperations(fsExplorer: any, t: (key: string, values?: Record<string, unknown>) => string) {
  const dialogs = useOwdDialogs()

  async function pasteClipboardFiles() {
    const files = fsExplorer.fsClipboard.clipboardFiles
    const type = fsExplorer.fsClipboard.clipboardType.value

    if (!files?.value.length || !type) return

    const operations: Promise<void>[] = []

    for (const sourcePath of files.value) {
      const fileName = sourcePath.split('/').pop()
      if (!fileName) continue

      const targetPath = explorerEntryAbsolutePath(
        fsExplorer.basePath.value,
        fileName,
      )
      const exists = await fsExplorer.pathExists(targetPath)

      if (exists) {
        const confirmed = await dialogs.confirm({
          title: t('apps.explorer.dialog.fileOverride.confirm.title'),
          message: t('apps.explorer.dialog.fileOverride.confirm.message', {
            name: fileName,
          }),
          acceptLabel: t('apps.explorer.action.yes'),
          rejectLabel: t('apps.explorer.action.no'),
        })
        if (!confirmed) continue
      }

      operations.push(fsExplorer.pasteFile(sourcePath, targetPath, type))
    }

    try {
      await Promise.all(operations)
      if (type === 'cut') fsExplorer.fsClipboard.clearClipboard()
      await fsExplorer.refreshDirectory()
    } catch (err) {
      console.error('Error while pasting files', err)
    }
  }

  async function deleteSelectedFiles(toTrash: boolean = true) {
    if (!fsExplorer.selectedFiles.value.length) return

    const count = fsExplorer.selectedFiles.value.length
    const isSingle = count === 1

    const confirmed = await dialogs.confirm({
      title: t(
        isSingle
          ? 'apps.explorer.dialog.deleteFile.confirm.title'
          : 'apps.explorer.dialog.deleteFiles.confirm.title',
      ),
      message: t(
        toTrash
          ? isSingle
            ? 'apps.explorer.dialog.deleteFile.confirm.message.toTrash'
            : 'apps.explorer.dialog.deleteFiles.confirm.message.toTrash'
          : isSingle
            ? 'apps.explorer.dialog.deleteFile.confirm.message.toVoid'
            : 'apps.explorer.dialog.deleteFiles.confirm.message.toVoid',
        {
          count,
          fileName: fsExplorer.selectedFiles.value[0].split('/').pop(),
        },
      ),
      acceptLabel: t('apps.explorer.action.yes'),
      rejectLabel: t('apps.explorer.action.no'),
      extras: { toTrash },
    })

    if (!confirmed) return

    try {
      if (toTrash) {
        await fsExplorer.movePathsToTrash(fsExplorer.selectedFiles.value)
      } else {
        await fsExplorer.deletePaths(fsExplorer.selectedFiles.value)
      }
      await fsExplorer.refreshDirectory()
    } catch (e) {
      console.error(e)
    }
  }

  return {
    pasteClipboardFiles,
    deleteSelectedFiles,
  }
}
