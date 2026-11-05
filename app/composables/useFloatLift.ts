/*
 * Things pinned to the bottom of the screen (mini player, a page's sticky Play bar) register their
 * height here; toasts, the back-to-top button and prompts sit above them via `--float-lift` instead of
 * landing on top of each other.
 */
export function useFloatLift(key: string) {
  const lifts = useState<Record<string, number>>('float-lifts', () => ({}))

  function apply() {
    if (!import.meta.client) return
    const total = Object.values(lifts.value).reduce((a, b) => a + b, 0)
    document.documentElement.style.setProperty('--float-lift', `${total}px`)
  }

  /** `px` is the element's height; 0 (or hidden) takes it out */
  function set(px: number) {
    const next = px > 0 ? Math.ceil(px) + 12 : 0
    if ((lifts.value[key] ?? 0) === next) return
    lifts.value = { ...lifts.value, [key]: next }
    apply()
  }

  onBeforeUnmount(() => set(0))
  return { set }
}
