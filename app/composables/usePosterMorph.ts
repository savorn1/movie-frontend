/*
 * The tapped poster grows into the series page's big poster, and shrinks back into its card on the
 * way back (CSS view transitions, already on through Nuxt's experimental.viewTransition).
 *
 * A view transition pairs elements by name, and a name must be unique on the page, but the same series
 * can show in several rows. So no card is named up front: the tapped one is named for this one
 * navigation, and on the way back the first card of that series to appear claims the name.
 * The series page's poster is always named "poster" (detail/[id].vue).
 */
const NAME = 'poster'
const HOLD_MS = 1000

const supported = () => import.meta.client && 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function usePosterMorph() {
  const seriesId = useState<number | null>('poster-morph', () => null)

  function name(el: HTMLElement) {
    el.style.viewTransitionName = NAME
    el.dataset.morph = '1'
    setTimeout(() => {
      el.style.viewTransitionName = ''
      delete el.dataset.morph
    }, HOLD_MS)
  }

  /** A poster was tapped: it becomes the series page's poster */
  function start(id: number, img: HTMLElement | undefined) {
    if (!img || !supported()) return
    seriesId.value = id
    name(img)
  }

  /** A poster card appeared: if it's the series we just came back from (and none has claimed it), it receives the poster */
  function claim(id: number, img: HTMLElement | undefined) {
    if (!img || seriesId.value !== id || !supported()) return
    if (document.querySelector('[data-morph]')) return
    name(img)
    seriesId.value = null
  }

  return { start, claim }
}
