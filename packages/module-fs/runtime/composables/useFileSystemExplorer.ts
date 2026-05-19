import { ref, watch } from 'vue'
import { fs } from '@zenfs/core'
import type { IWindowController } from '@owdproject/core'

import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopDefaultAppsStore } from '@owdproject/core/runtime/stores/storeDesktopDefaultApps'
import { explorerEntryAbsolutePath } from '@owdproject/core/runtime/utils/explorerEntryPath'
import { shellEscape } from '@owdproject/core/runtime/utils/utilTerminal'

import { getAppByFilename } from '@owdproject/module-fs/runtime/utils/utilFileSystem'
import {
  importExternalFilesToDirectory,
  type ExternalFileEntry,
} from '@owdproject/module-fs/runtime/utils/utilExternalFileImport'
import { isInvalidMoveTarget } from '@owdproject/module-fs/runtime/utils/utilExplorerMove'
import { useFileSystemClipboard } from '@owdproject/module-fs/runtime/composables/useFileSystemClipboard'
import { useFileSystemDirectoryNavigation } from '@owdproject/module-fs/runtime/composables/useFileSystemDirectoryNavigation'
import { useFileSystemKeyboardActions } from '@owdproject/module-fs/runtime/composables/useFileSystemKeyboardActions'

import { useOwdDialogs } from '@owdproject/core/runtime/composables/useOwdDialogs'

const TRASH_PATH = '/tmp'

export function useFileSystemExplorer(
  owdWindow: IWindowController,
  useFsController: (fsExplorer: any, t: (key: string, values?: Record<string, unknown>) => string) => any,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  const desktopDefaultAppsStore = useDesktopDefaultAppsStore()

  const basePath = ref(owdWindow.meta.path ?? '/')
  const selectedFiles = ref<string[]>([])
  const layout = ref<string>('')

  const fsEntries = ref<string[]>([])

  const fsClipboard = useFileSystemClipboard()
  useFileSystemKeyboardActions(owdWindow, {
    onDelete: async (toTrash) => {
      fsExplorer.fsController?.deleteSelectedFiles(toTrash)
    },
    onCopy: async () => {
      fsExplorer.copySelectedFiles()
    },
    onCut: async () => {
      fsExplorer.cutSelectedFiles()
    },
    onPaste: async () => {
      fsExplorer.fsController?.pasteClipboardFiles()
    },
  })
  const fsDirectoryNavigation = useFileSystemDirectoryNavigation(basePath.value)

  const dialogs = useOwdDialogs()

  // update window meta path when basePath change
  // due to folderUp or folder navigation
  watch(() => basePath.value,() => {
      owdWindow.meta.path = basePath.value
    },
  )

  async function initialize() {
    await navigateToDirectory(basePath.value)
  }

  async function navigateToDirectory(path: string) {
    if (/^https?:\/\//i.test(String(path).trim())) {
      fsEntries.value = []
      return
    }
    try {
      fsEntries.value = fs.readdirSync(path)
    } catch (e) {
      console.error(e)
      fsEntries.value = []
    }
  }

  async function refreshDirectory() {
    await navigateToDirectory(basePath.value)
  }

  async function openDirectory(fileName: string) {
    const fullPath = explorerEntryAbsolutePath(basePath.value, fileName)

    try {
      const stats = fs.statSync(fullPath)
      if (!stats.isDirectory()) return

      basePath.value = fullPath
      await navigateToDirectory(fullPath)

      // fsDirectoryNavigation

      fsDirectoryNavigation.push(fullPath)
      basePath.value = fullPath
    } catch (err) {
      console.error(err)
    }
  }

  async function openFile(fileName: string) {
    const appRequired = getAppByFilename(fileName)
    const applicationManager = useApplicationManager()

    if (appRequired) {
      const defaultApp = desktopDefaultAppsStore.getDefaultApp(appRequired)


      if (defaultApp) {
        const path = shellEscape(explorerEntryAbsolutePath(basePath.value, fileName))

        applicationManager.launchAppEntry(
          defaultApp.applicationId,
          defaultApp.entry,
          `'${path}' --autoplay`
        )
      }
    }
  }

  function selectFiles(fileNames: string[]) {
    selectedFiles.value = fileNames.map((name) =>
      explorerEntryAbsolutePath(basePath.value, name),
    )
  }

  function selectAllFiles() {
    if (Array.isArray(fsEntries.value)) {
      selectedFiles.value = fsEntries.value.map((name) =>
        explorerEntryAbsolutePath(basePath.value, name),
      )
    }
  }

  function invertSelection() {
    if (!Array.isArray(fsEntries.value)) return

    const currentSelection = new Set(selectedFiles.value)

    selectedFiles.value = fsEntries.value
      .filter((name) => {
        return !currentSelection.has(
          explorerEntryAbsolutePath(basePath.value, name),
        )
      })
      .map((name) => explorerEntryAbsolutePath(basePath.value, name))
  }

  function cutSelectedFiles() {
    fsClipboard.setClipboard(selectedFiles.value, 'cut')
  }

  function copySelectedFiles() {
    fsClipboard.setClipboard(selectedFiles.value, 'copy')
  }

  /**
   * Moves a file or directory from source to target, handling cross-device issues.
   * For files: falls back to copy + unlink if fs.rename fails due to EXDEV.
   * For directories: falls back to copy + rm if rename fails.
   *
   * Supports both file and directory moves in virtual or simulated environments.
   *
   * @param source - original path (file or directory)
   * @param target - destination path
   */
  async function moveFileOrDirectorySafe(source: string, target: string) {
    try {
      await fs.promises.rename(source, target)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined
      if (code === 'EXDEV') {
        const stat = await fs.promises.stat(source)

        if (stat.isFile()) {
          await fs.promises.copyFile(source, target)
          await fs.promises.unlink(source)
        } else if (stat.isDirectory()) {
          // Recursively copy directory, then remove original
          await fs.promises.cp(source, target, { recursive: true })
          await fs.promises.rm(source, { recursive: true, force: true })
        }
      } else {
        throw err
      }
    }
  }

  /**
   * Moves given files or directories to the virtual Trash folder inside the simulated fs.
   * Creates the Trash directory if it doesn't exist.
   *
   * @param paths - Array of paths to move to trash.
   */
  async function movePathsToTrash(paths: string[]) {
    try {
      // Create Trash directory if missing
      const exists = await pathExists(TRASH_PATH)

      if (!exists) {
        await fs.promises.mkdir(TRASH_PATH, { recursive: true })
      }
    } catch (err) {
      console.error('Error creating Trash folder:', err)
    }

    for (const fullPath of paths) {
      try {
        const fileName = fullPath.split('/').pop() || 'unknown'

        // Avoid collisions in Trash: append timestamp or similar
        const timestamp = Date.now()
        const trashPath = `${TRASH_PATH}/${timestamp}_${fileName}`

        await moveFileOrDirectorySafe(fullPath, trashPath)
      } catch (err) {
        console.error(`Error moving ${fullPath} to trash:`, err)
      }
    }
  }

  async function deletePaths(paths: string[]) {
    for (const fullPath of paths) {
      const stats = await fs.promises.stat(fullPath)
      if (stats.isFile()) {
        await fs.promises.unlink(fullPath)
      } else if (stats.isDirectory()) {
        await fs.promises.rm(fullPath, { recursive: true, force: true })
      }
    }
  }

  async function importExternalFiles(
    entries: ExternalFileEntry[],
    targetDirectory?: string,
  ) {
    if (!entries.length) return
    const directory = targetDirectory ?? basePath.value
    await importExternalFilesToDirectory(directory, entries)
    await refreshDirectory()
  }

  async function movePathsToDirectory(
    sources: string[],
    targetDirectory: string,
  ) {
    for (const source of sources) {
      if (isInvalidMoveTarget(source, targetDirectory)) continue

      const fileName = source.split('/').filter(Boolean).pop()
      if (!fileName) continue

      const targetPath = explorerEntryAbsolutePath(targetDirectory, fileName)
      if (source === targetPath) continue

      await moveFileOrDirectorySafe(source, targetPath)
    }

    selectedFiles.value = []
    await refreshDirectory()
  }

  async function pasteFile(filePath: string, targetPath: string, type: 'copy' | 'cut') {
    if (type === 'copy') {
      await fs.promises.copyFile(filePath, targetPath)
    } else if (type === 'cut') {
      await fs.promises.rename(filePath, targetPath)
    }
  }

  async function pathExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path)
      return true
    } catch {
      return false
    }
  }

  async function pasteShortcuts() {
    const files = fsClipboard.clipboardFiles
    if (!files?.value.length) return

    const operations: Promise<void>[] = []

    for (const filePath of files.value) {
      const fileName = filePath.split('/').pop()
      if (!fileName) continue

      const linkPath = explorerEntryAbsolutePath(basePath.value, fileName)

      const exists = await fs.promises
        .access(linkPath)
        .then(() => true)
        .catch(() => false)

      if (exists) {
        const shouldOverwrite = await dialogs.confirm({
          title: t('dialog.shortcutOverride.confirm.title'),
          message: t('dialog.shortcutOverride.confirm.message', { name: fileName }),
          acceptLabel: t('apps.explorer.action.ok'),
          rejectLabel: t('apps.explorer.action.cancel'),
        })

        if (!shouldOverwrite) continue
      }

      operations.push(fs.promises.symlink(filePath, linkPath))
    }

    try {
      await Promise.all(operations)
      await refreshDirectory()
    } catch (err) {
      console.error(
        'Error while creating symbolic links',
        err,
      )
    }
  }

  async function directoryUp() {
    const parts = basePath.value.split('/').filter(Boolean)
    if (parts.length === 0) return
    parts.pop()
    basePath.value = '/' + parts.join('/')

    await refreshDirectory()
  }

  async function directoryBack() {
    const prev = fsDirectoryNavigation.back()
    if (prev) {
      basePath.value = prev
      await navigateToDirectory(prev)
    }
  }

  async function directoryForward() {
    const next = fsDirectoryNavigation.forward()
    if (next) {
      basePath.value = next
      await navigateToDirectory(next)
    }
  }

  function operationUndo() {
    void dialogs.alert('This should be implemented')
  }

  function fileProperties() {
    void dialogs.alert('This should be implemented')
  }

  async function createNewDirectory() {
    const folderName = await dialogs.prompt('Type a name for the new folder')
    if (!folderName) return

    const newFolderPath = explorerEntryAbsolutePath(basePath.value, folderName)

    try {
      await fs.promises.mkdir(newFolderPath)
      await refreshDirectory()
    } catch (err) {
      console.error('Error while creating the folder', err)
    }
  }

  async function createSymbolicLink() {
    const targetPath = await dialogs.prompt(
      'Write a path for the symbolic link destination',
    )
    if (!targetPath) return

    const linkName = await dialogs.prompt('Write a name for the symbolic link')
    if (!linkName) return

    const linkPath = explorerEntryAbsolutePath(basePath.value, linkName)

    try {
      await fs.promises.symlink(targetPath, linkPath)
      await refreshDirectory()
    } catch (err) {
      console.error('Error while creating the symbolic link:', err)
    }
  }

  function setLayout(value: string) {
    layout.value = value
  }

  const fsExplorer = {
    fsController: undefined as any,
    fsEntries,
    fsClipboard,
    fsDirectoryNavigation,

    initialize,
    basePath,
    selectedFiles,
    refreshDirectory,
    openDirectory,
    directoryBack,
    directoryForward,
    directoryUp,
    openFile,
    selectFiles,
    selectAllFiles,
    invertSelection,
    cutSelectedFiles,
    copySelectedFiles,
    movePathsToTrash,
    deletePaths,
    pathExists,
    pasteFile,
    pasteShortcuts,
    importExternalFiles,
    movePathsToDirectory,
    fileProperties,
    operationUndo,
    navigateToDirectory,
    createNewDirectory,
    createSymbolicLink,
    layout,
    setLayout,
  }

  fsExplorer.fsController = useFsController(fsExplorer, t)

  return fsExplorer
}
