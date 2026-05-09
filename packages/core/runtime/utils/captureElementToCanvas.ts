/**
 * Renders a DOM subtree to a canvas via html2canvas (optional dependency).
 * Used for workspace thumbnails / previews; returns null if capture fails or html2canvas is missing.
 */
export async function captureElementToCanvas(
  element: HTMLElement | null | undefined,
  options?: Record<string, unknown>,
): Promise<HTMLCanvasElement | null> {
  if (!element || typeof window === 'undefined') {
    return null
  }
  try {
    const { default: html2canvas } = await import('html2canvas')
    return await html2canvas(element, {
      allowTaint: true,
      ...(options as object),
    })
  } catch {
    return null
  }
}
