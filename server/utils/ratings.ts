import type { LikeTotals } from '#shared/data/movies'

/*
 * Per-episode 👍/👎. Kept in VideoLingo's database through movie-api when movieApiEnabled(), else in .data:
 *   series:<id> -> { "<ep>": { up, down } }
 */
const key = (seriesId: number) => `series:${seriesId}`

/** { "<ep>": { up, down } } for one series */
export async function ratingsOf(seriesId: number): Promise<Record<string, LikeTotals>> {
  if (movieApiEnabled()) {
    const stats = await apiCall<ApiEpisodeStats[]>('GET', `/series/${seriesId}/stats`)
    return Object.fromEntries(stats.filter(s => s.likes || s.dislikes).map(s => [s.episode, { up: s.likes, down: s.dislikes }]))
  }
  return (await useStorage('ratings').getItem<Record<string, LikeTotals>>(key(seriesId))) ?? {}
}

/** Move a viewer's vote from `previous` to `vote` (each 1, -1 or 0); returns the episode's new totals */
export async function castVote(seriesId: number, ep: number, vote: number, previous: number): Promise<LikeTotals> {
  if (movieApiEnabled()) {
    const t = await apiCall<{ likes: number; dislikes: number }>('POST', '/votes', { seriesId, episode: ep, vote, previous })
    return { up: t.likes, down: t.dislikes }
  }
  const store = useStorage('ratings')
  const all = (await store.getItem<Record<string, LikeTotals>>(key(seriesId))) ?? {}
  const t = all[ep] ?? { up: 0, down: 0 }
  if (previous === 1) t.up = Math.max(0, t.up - 1)
  if (previous === -1) t.down = Math.max(0, t.down - 1)
  if (vote === 1) t.up++
  if (vote === -1) t.down++
  all[ep] = t
  await store.setItem(key(seriesId), all)
  return t
}

/** 👍/👎 per series, all episodes summed */
export async function likeSummary(): Promise<Record<number, LikeTotals>> {
  if (movieApiEnabled()) {
    const bySeries = await apiCall<Record<string, { likes: number; dislikes: number }>>('GET', '/likes')
    return Object.fromEntries(Object.entries(bySeries).map(([id, t]) => [Number(id), { up: t.likes, down: t.dislikes }]))
  }
  const store = useStorage('ratings')
  const out: Record<number, LikeTotals> = {}
  for (const k of await store.getKeys('series')) {
    const id = Number(k.split(':').pop())
    const perEp = (await store.getItem<Record<string, LikeTotals>>(k)) ?? {}
    out[id] = Object.values(perEp).reduce((t, e) => ({ up: t.up + e.up, down: t.down + e.down }), { up: 0, down: 0 })
  }
  return out
}
