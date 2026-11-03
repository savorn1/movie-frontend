import { categoryLabels, type Movie } from '#shared/data/movies'

type Category = Movie['category']

/**
 * "For you" picks from this viewer's own signals (all in the browser, nothing sent anywhere):
 * episodes watched, saves, follows and episode ratings score each category; we then suggest
 * popular series in the top category that the viewer hasn't started. Null without any signal.
 */
export function useForYou(limit = 10) {
  const { history, favorites, following, ratings } = useLibrary()
  const { find, hotNow } = useCatalog()

  return computed(() => {
    const score: Record<Category, number> = { cultivation: 0, romance: 0, fantasy: 0 }
    const byId = find
    const add = (id: number, n: number) => {
      const m = byId(id)
      if (m) score[m.category] += n
    }

    for (const h of history.value) add(h.id, Math.min(h.ep, 10))
    for (const id of favorites.value) add(id, 3)
    for (const id of following.value) add(id, 3)
    for (const [key, vote] of Object.entries(ratings.value)) add(Number(key.split(':')[0]), vote * 2)

    const ranked = (Object.keys(score) as Category[]).filter(c => score[c] > 0).sort((a, b) => score[b] - score[a])
    if (!ranked.length) return null

    const started = new Set([...history.value.map(h => h.id), ...favorites.value])
    // Popular-first within the viewer's favourite category, topped up from the next ones
    const items = ranked
      .flatMap(c => hotNow.value.filter(m => m.category === c && !started.has(m.id)))
      .slice(0, limit)
    if (items.length < 3) return null

    const top = ranked[0]!
    return { category: top, label: categoryLabels[top], items }
  })
}
