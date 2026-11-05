/**
 * A short vibration on phones that support it (Android; iPhone browsers ignore it), so confirmations
 * feel the same everywhere: a tap for small toggles, a double pulse for success, a longer buzz for
 * errors. Skipped when the viewer asked for reduced motion.
 */
const PATTERNS = { tap: 10, success: [12, 60, 24], error: [40, 40, 40] } as const

export function haptic(kind: keyof typeof PATTERNS = 'tap') {
  if (!import.meta.client || typeof navigator.vibrate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  // Browsers refuse (and log an error) before the viewer has tapped anything on the page
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (activation && !activation.hasBeenActive) return
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[])
  } catch {
    // Some browsers throw outside a user gesture: feedback is optional
  }
}
