/*
 * Anonymous viewing events from the player: "start" when an episode first plays on a device,
 * "complete" when it reaches 90%. The player sends each at most once per device and episode.
 *   POST { seriesId, ep, kind: 'start' | 'complete' }
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'insights', 120)
  const body = await readBody<{ seriesId?: number; ep?: number; kind?: string }>(event)
  const movie = await findSeries(Number(body?.seriesId))
  const ep = Number(body?.ep)
  if (!movie || !Number.isInteger(ep) || ep < 1 || ep > movie.episodes || !['start', 'complete'].includes(body?.kind ?? '')) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, ep, kind: "start" | "complete" }' })
  }

  const all = await getInsights(movie.id)
  const s = all[ep] ?? { starts: 0, completes: 0 }
  if (body!.kind === 'start') s.starts++
  else s.completes++
  all[ep] = s
  await useStorage('insights').setItem(insightsKey(movie.id), all)
  setResponseStatus(event, 204)
  return null
})
