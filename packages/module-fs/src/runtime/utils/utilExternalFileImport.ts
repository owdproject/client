import { fs } from '@zenfs/core'
import { explorerEntryAbsolutePath } from '@owdproject/core/runtime/utils/explorerEntryPath'

export type ExternalFileEntry = {
  file: File
  /** Path relative to the drop target directory (supports nested folder import). */
  relativePath: string
}

export async function writeExternalFile(targetPath: string, file: File): Promise<void> {
  const slash = targetPath.lastIndexOf('/')
  const parent = slash > 0 ? targetPath.slice(0, slash) : '/'
  if (parent !== '/') {
    await fs.promises.mkdir(parent, { recursive: true })
  }

  const buffer = new Uint8Array(await file.arrayBuffer())
  await fs.promises.writeFile(targetPath, buffer)
}

export async function importExternalFilesToDirectory(
  targetDirectory: string,
  entries: ExternalFileEntry[],
): Promise<string[]> {
  const written: string[] = []

  for (const { file, relativePath } of entries) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normalized) continue

    const targetPath = explorerEntryAbsolutePath(targetDirectory, normalized)
    await writeExternalFile(targetPath, file)
    written.push(targetPath)
  }

  return written
}

async function readDirectoryEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
    reader.readEntries(resolve, reject)
  })

  if (!batch.length) return []

  const nested = await readDirectoryEntries(reader)
  return [...batch, ...nested]
}

async function traverseEntry(
  entry: FileSystemEntry,
  parentPath: string,
  output: ExternalFileEntry[],
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      ;(entry as FileSystemFileEntry).file(resolve, reject)
    })

    const relativePath = parentPath ? `${parentPath}/${file.name}` : file.name
    output.push({ file, relativePath })
    return
  }

  if (!entry.isDirectory) return

  const reader = (entry as FileSystemDirectoryEntry).createReader()
  const children = await readDirectoryEntries(reader)
  const nextParent = parentPath ? `${parentPath}/${entry.name}` : entry.name

  for (const child of children) {
    await traverseEntry(child, nextParent, output)
  }
}

async function collectFromDataTransferItems(
  dataTransfer: DataTransfer,
): Promise<ExternalFileEntry[]> {
  const output: ExternalFileEntry[] = []
  const items = dataTransfer.items

  if (!items?.length) return output

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind !== 'file') continue

    const entry = item.webkitGetAsEntry?.()
    if (entry) {
      await traverseEntry(entry, '', output)
      continue
    }

    const file = item.getAsFile()
    if (file) {
      output.push({ file, relativePath: file.name })
    }
  }

  return output
}

async function collectFromUriList(
  dataTransfer: DataTransfer,
): Promise<ExternalFileEntry[]> {
  const uri = dataTransfer
    .getData('text/uri-list')
    ?.split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'))

  if (!uri || !/^https?:\/\//i.test(uri)) return []

  try {
    const response = await fetch(uri)
    if (!response.ok) return []

    const blob = await response.blob()
    const fromUrl = decodeURIComponent(uri.split('/').pop()?.split('?')[0] ?? '')
    const name = fromUrl || 'download'
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' })
    return [{ file, relativePath: file.name }]
  } catch {
    return []
  }
}

/** Collect OS files, folders, or dragged image URLs from a drop event. */
export async function collectExternalFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<ExternalFileEntry[]> {
  let entries = await collectFromDataTransferItems(dataTransfer)

  if (!entries.length && dataTransfer.files?.length) {
    entries = Array.from(dataTransfer.files).map((file) => ({
      file,
      relativePath: file.name,
    }))
  }

  if (!entries.length) {
    entries = await collectFromUriList(dataTransfer)
  }

  return entries
}
