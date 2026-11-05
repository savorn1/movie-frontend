import { imageWidthFor } from '#shared/utils/imageSizes'

/**
 * Catalog artwork resized on our server (/img): a 120 px poster no longer downloads a 1600 px file.
 * `width` is the CSS width it's drawn at; non-http sources pass through untouched.
 */
export function imgSrc(url: string | null | undefined, width: number) {
  if (!url || !/^https?:\/\//.test(url)) return url ?? ''
  return `/img?w=${imageWidthFor(width)}&u=${encodeURIComponent(url)}`
}

/** "… 1x, … 2x" for sharp phone screens */
export const imgSrcset = (url: string | null | undefined, width: number) =>
  url && /^https?:\/\//.test(url) ? `${imgSrc(url, width)} 1x, ${imgSrc(url, width * 2)} 2x` : undefined
