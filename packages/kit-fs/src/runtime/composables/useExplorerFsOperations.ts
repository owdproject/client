import { useDesktopDialogs } from '@owdproject/kit-theme/runtime/composables/useDesktopDialogs'
import { explorerEntryAbsolutePath } from '@owdproject/core/runtime/utils/explorerEntryPath'
import type { ExternalFileEntry } from '@owdproject/module-fs/runtime/utils/utilExternalFileImport'
import { isInvalidMoveTarget } from '@owdproject/module-fs/runtime/utils/utilExplorerMove'

/**
 * Pass this factory as the second argument to {@link useFileSystemExplorer} (`module-fs`).
 * Uses {@link useDesktopDialogs} and i18n keys `apps.explorer.*` for destructive operations.
 */
export default function createExplorerFsOperations(fsExplorer: any, t: (key: string, values?: Record<string, unknown>) => string) {
  const dialogs = useDesktopDialogs()

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

  async function importDroppedExternalFiles(
    entries: ExternalFileEntry[],
    targetDirectory?: string,
  ) {
    if (!entries.length) return

    const targetDir = targetDirectory ?? fsExplorer.basePath.value
    const accepted: ExternalFileEntry[] = []

    for (const entry of entries) {
      const fileName = entry.relativePath.split('/').pop()
      if (!fileName) continue

      const targetPath = explorerEntryAbsolutePath(
        targetDir,
        entry.relativePath,
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

      accepted.push(entry)
    }

    if (!accepted.length) return

    try {
      await fsExplorer.importExternalFiles(accepted, targetDir)
    } catch (err) {
      console.error('Error while importing dropped files', err)
    }
  }

  async function moveDroppedVfsPaths(
    paths: string[],
    targetDirectory?: string,
  ) {
    if (!paths.length) return

    const targetDir = targetDirectory ?? fsExplorer.basePath.value
    const accepted: string[] = []

    for (const sourcePath of paths) {
      if (isInvalidMoveTarget(sourcePath, targetDir)) continue

      const fileName = sourcePath.split('/').filter(Boolean).pop()
      if (!fileName) continue

      const targetPath = explorerEntryAbsolutePath(targetDir, fileName)
      if (sourcePath === targetPath) continue

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

      accepted.push(sourcePath)
    }

    if (!accepted.length) return

    try {
      await fsExplorer.movePathsToDirectory(accepted, targetDir)
    } catch (err) {
      console.error('Error while moving dropped files', err)
    }
  }

  return {
    pasteClipboardFiles,
    deleteSelectedFiles,
    importDroppedExternalFiles,
    moveDroppedVfsPaths,
  }
}
