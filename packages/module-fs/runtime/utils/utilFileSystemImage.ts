export function isImageFile(extension: string): boolean {
  const supportedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
  return supportedImageExtensions.has(extension.toLowerCase())
}
