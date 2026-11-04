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

  return castVote(movie.id, ep, vote, previous)
})
