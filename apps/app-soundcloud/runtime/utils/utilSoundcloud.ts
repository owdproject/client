// checks if the url is a valid soundcloud track url
export function isValidSoundcloudUrl(url: string) {
  const regex =
    /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\/)?(\?.*)?$/
  return regex.test(url)
}
