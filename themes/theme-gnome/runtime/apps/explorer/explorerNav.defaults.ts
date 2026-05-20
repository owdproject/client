export type ExplorerNavFolder = {
  id: string
  label: string
  path: string
  icon: string
}

export const GNOME_EXPLORER_SPECIAL_FOLDERS: ExplorerNavFolder[] = [
  { id: 'documents', label: 'Documents', path: '/Documents', icon: 'mdi:file-document' },
  { id: 'development', label: 'Development', path: '/Development', icon: 'mdi:code-braces' },
  { id: 'music', label: 'Music', path: '/Music', icon: 'mdi:music-note' },
  { id: 'pictures', label: 'Pictures', path: '/Pictures', icon: 'mdi:image' },
  { id: 'videos', label: 'Videos', path: '/Videos', icon: 'mdi:video' },
  { id: 'downloads', label: 'Downloads', path: '/Downloads', icon: 'mdi:download' },
]

/** Quick Access: user pins only (seed often just Home). Shell folders live under `specialFolders`, not here. */
export const GNOME_EXPLORER_QUICK_ACCESS_SEED: ExplorerNavFolder[] = [
  { id: 'home', label: 'Home', path: '/', icon: 'mdi:home' },
]
