/** Widths /img resizes to (a short fixed list keeps the cache small and the route hard to abuse) */
export const IMAGE_WIDTHS = [120, 160, 240, 320, 480, 640, 960, 1280, 1920] as const

/** The smallest allowed width that is at least `w` */
export const imageWidthFor = (w: number) => IMAGE_WIDTHS.find(x => x >= w) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]
