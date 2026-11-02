/** True once the app has mounted in the browser; gate per-viewer UI on it to avoid hydration mismatches. */
export const useHydrated = () => useState('hydrated', () => false)
