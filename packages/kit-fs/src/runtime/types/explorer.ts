export interface ExplorerFolderConfig {
  id: string
  label: string
  path: string
  icon?: string
}

export interface ExplorerConfig {
  quickAccess?: ExplorerFolderConfig[]
  quickAccessExtra?: ExplorerFolderConfig[]
  quickAccessOverride?: ExplorerFolderConfig[]
  specialFolders?: ExplorerFolderConfig[]
  specialFoldersExtra?: ExplorerFolderConfig[]
  specialFoldersOverride?: ExplorerFolderConfig[]
  /** Friendly labels for ZenFS mount points shown under “This PC” (paths → label). */
  mountLabels?: Record<string, string>
}
