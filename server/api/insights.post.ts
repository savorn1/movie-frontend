/*
 * Anonymous viewing events from the player: "start" when an episode first plays on a device,
 * "complete" when it reaches 90%, "wall" when the unlock screen shows (paywall analytics). The player
 * sends each at most once per device and episode.
 *   POST { seriesId, ep, kind: 'start' | 'complete' | 'wall' }
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'insights', 120)
  const body = await readBody<{ seriesId?: number; ep?: number; kind?: string }>(event)
  const movie = await findSeries(Number(body?.seriesId))
  const ep = Number(body?.ep)
  if (!movie || !Number.isInteger(ep) || ep < 1 || ep > movie.episodes || !['start', 'complete', 'wall'].includes(body?.kind ?? '')) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, ep, kind: "start" | "complete" | "wall" }' })
  }

  await recordPlay(movie.id, ep, body!.kind as 'start' | 'complete' | 'wall')
  setResponseStatus(event, 204)
  return null
})
