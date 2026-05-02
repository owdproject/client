import { useOwdDialogs } from '@owdproject/core/runtime/composables/useOwdDialogs'

export default function useFsController(fsExplorer, t) {
  const dialogs = useOwdDialogs()
  /**
   * Handles pasting files that have been copied or cut into the current directory.
   * For each file in the clipboard:
   * - Checks if the target file already exists.
   * - If it exists, prompts the user to confirm overwriting using confirmDialog helper.
   * - Performs the copy or move operation accordingly.
   * After all operations complete, refreshes the directory contents and clears the clipboard if files were cut.
   */
  async function pasteClipboardFiles() {
    const files = fsExplorer.fsClipboard.clipboardFiles
    const type = fsExplorer.fsClipboard.clipboardType.value

    if (!files?.value.length || !type) return

    const operations: Promise<void>[] = []

    for (const sourcePath of files.value) {
      const fileName = sourcePath.split('/').pop()
      if (!fileName) continue

      const targetPath = `${fsExplorer.basePath.value}/${fileName}`
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

  /**
   * Deletes the currently selected files after user confirmation.
   * Shows a confirmation dialog indicating the number of files to delete, using confirmDialog helper.
   * If the user accepts, deletes all selected files and refreshes the directory.
   * Handles errors by logging them to the console.
   */
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
