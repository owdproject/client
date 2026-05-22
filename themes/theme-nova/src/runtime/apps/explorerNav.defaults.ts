export type ExplorerNavFolder = {
  id: string
  label: string
  path: string
  icon: string
}

export const NOVA_EXPLORER_SPECIAL_FOLDERS: ExplorerNavFolder[] = [
  { id: 'desktop', label: 'Desktop', path: '/Desktop', icon: 'mdi:monitor' },
  { id: 'documents', label: 'Documents', path: '/Documents', icon: 'mdi:file-document' },
  { id: 'downloads', label: 'Downloads', path: '/Downloads', icon: 'mdi:download' },
  { id: 'music', label: 'Music', path: '/Music', icon: 'mdi:music-note' },
  { id: 'pictures', label: 'Pictures', path: '/Pictures', icon: 'mdi:image' },
  { id: 'videos', label: 'Videos', path: '/Videos', icon: 'mdi:video' },
]

/** Quick Access: user pins only (seed often just Home). Shell folders live under `specialFolders`, not here. */
export const NOVA_EXPLORER_QUICK_ACCESS_SEED: ExplorerNavFolder[] = [
  { id: 'home', label: 'Home', path: '/', icon: 'mdi:home' },
]
