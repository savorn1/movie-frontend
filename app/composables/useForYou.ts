import { categoryLabels, type Movie } from '#shared/data/movies'

type Category = Movie['category']

/**
 * "For you" picks from this viewer's own signals (all in the browser, nothing sent anywhere):
 * episodes watched, saves, follows and episode ratings score each category; we then suggest
 * popular series in the top category that the viewer hasn't started. Null without any signal.
 */
export function useForYou(limit = 10) {
  const { history, favorites, following, ratings, prefs } = useLibrary()
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
    // Genres picked on the first visit: a nudge toward series that have them, outweighed by real watching
    const picked = prefs.value.genres ?? []
    if (picked.length) {
      for (const m of hotNow.value) if (m.genres.some(g => picked.includes(g))) score[m.category] += 1
    }

    const ranked = (Object.keys(score) as Category[]).filter(c => score[c] > 0).sort((a, b) => score[b] - score[a])
    if (!ranked.length) return null

    const started = new Set([...history.value.map(h => h.id), ...favorites.value])
    // Popular-first within the viewer's favourite category, topped up from the next ones
    const genreFirst = (list: typeof hotNow.value) =>
      picked.length ? [...list].sort((a, b) => Number(b.genres.some(g => picked.includes(g))) - Number(a.genres.some(g => picked.includes(g)))) : list
    const items = ranked
      .flatMap(c => genreFirst(hotNow.value.filter(m => m.category === c && !started.has(m.id))))
      .slice(0, limit)
    if (items.length < 3) return null

    const top = ranked[0]!
    // Before any watching, the row is about the genres they picked
    const fromPicks = picked.length && !history.value.length && !favorites.value.length
    return { category: top, label: fromPicks ? picked.slice(0, 2).join(' · ') : categoryLabels[top], items }
  })
}
