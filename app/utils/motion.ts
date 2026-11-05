/** The viewer asked for less motion: skip movement, keep the result */
export const reducedMotion = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
