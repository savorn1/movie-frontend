const cache = new Map<string, string>()
const FALLBACK = '40 40 48'

/**
 * Average color of an image as an "r g b" string for `rgb(var(--ambient) / a)`.
 * Clamped to a mid-dark range so white text on top keeps its contrast.
 * Falls back quietly if the image host doesn't allow CORS.
 */
export function useAmbientColor(src: MaybeRefOrGetter<string | undefined>) {
  const color = ref(FALLBACK)

  watch(() => toValue(src), (url) => {
    if (!url || import.meta.server) return
    const hit = cache.get(url)
    if (hit) {
      color.value = hit
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 12
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, 12, 12)
        const data = ctx.getImageData(0, 0, 12, 12).data
        let r = 0, g = 0, b = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]!
          g += data[i + 1]!
          b += data[i + 2]!
        }
        const n = data.length / 4
        ;[r, g, b] = [r / n, g / n, b / n]
        // Keep the brightest channel between 70 and 140
        const max = Math.max(r, g, b, 1)
        const scale = Math.min(140, Math.max(70, max)) / max
        const value = [r, g, b].map(c => Math.round(c * scale)).join(' ')
        cache.set(url, value)
        if (toValue(src) === url) color.value = value
      } catch {}
    }
    img.src = url
  }, { immediate: true })

  return color
}
