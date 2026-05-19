export function isValidYouTubeUrl(url: string) {
  const regex =
    /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?youtube\.com\/(watch\?v=|playlist\?list=|embed\/|shorts\/)?([a-zA-Z0-9_-]+)(&.*)?$|^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)$/
  return regex.test(url)
}

export function isYouTubeMusicUrl(url: string) {
  // detect "music.youtube.com"
  return /^https?:\/\/(www\.)?(m\.)?music\.youtube\.com\//.test(url)
}

export function getYouTubeId(urlOrId: string) {
  // if it's already a valid ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId
  }

  // try matching standard YouTube URLs
  let match = urlOrId.match(
    /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?youtube\.com\/(watch\?v=|playlist\?list=|embed\/|shorts\/)?([a-zA-Z0-9_-]+)(&.*)?$/,
  )
  if (match && match[6]) {
    return match[6]
  }

  // try shortened URL format
  match = urlOrId.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)$/)
  if (match && match[1]) {
    return match[1]
  }

  return null
}
