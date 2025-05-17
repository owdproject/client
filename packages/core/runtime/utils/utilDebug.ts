export function isDebugMode() {
  return import.meta.env.MODE === 'development'
}

export function debugLog(...messages: any[]) {
  if (!isDebugMode()) {
    return false
  }

  console.log('[OWD]', ...messages)
  return true
}

export function debugWarn(...messages: any[]) {
  if (!isDebugMode()) {
    return false
  }

  console.warn('[OWD]', ...messages)
  return true
}

export function debugError(...messages: any[]) {
  if (!isDebugMode()) {
    return false
  }

  console.error('[OWD]', ...messages)
  return true
}
