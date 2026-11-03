interface Totals {
  up: number
  down: number
}

/*
 * Record a 👍/👎 for one episode. The client sends its previous vote so a changed or
 * cleared vote moves the totals instead of adding to them.
 *   POST { seriesId, ep, vote: 1 | -1 | 0, previous?: 1 | -1 }
 */
export default defineEventHandler(async (event) => {
  // Anonymous votes: cap how often one address can vote
  rateLimit(event, 'ratings', 30)

  const body = await readBody<{ seriesId?: number; ep?: number; vote?: number; previous?: number }>(event)
  const movie = await findSeries(Number(body?.seriesId))
  const ep = Number(body?.ep)
  const vote = Number(body?.vote)
  const previous = Number(body?.previous ?? 0)
  if (!movie || !Number.isInteger(ep) || ep < 1 || ep > movie.episodes
    || ![1, -1, 0].includes(vote) || ![1, -1, 0].includes(previous)) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, ep, vote: 1 | -1 | 0, previous? }' })
  }

  const store = useStorage('ratings')
  const key = `series:${movie.id}`
  const all = (await store.getItem<Record<string, Totals>>(key)) ?? {}
  const t = all[ep] ?? { up: 0, down: 0 }
  if (previous === 1) t.up = Math.max(0, t.up - 1)
  if (previous === -1) t.down = Math.max(0, t.down - 1)
  if (vote === 1) t.up++
  if (vote === -1) t.down++
  all[ep] = t
  await store.setItem(key, all)

  return t
})
