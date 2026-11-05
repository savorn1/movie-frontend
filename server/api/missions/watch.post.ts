/**
 * The signed-in viewer finished an episode ({ seriesId, episode }): counts for today's missions and for
 * the invite reward. Rate-limited, and movie-api counts each episode once per day.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'mission-watch', 30, 60 * 60_000)
  const body = await readBody<{ seriesId?: unknown; episode?: unknown }>(event)
  const seriesId = Number(body?.seriesId)
  const episode = Number(body?.episode)
  if (!Number.isInteger(seriesId) || !Number.isInteger(episode) || seriesId < 1 || episode < 1) {
    throw createError({ statusCode: 400, message: 'seriesId and episode are required' })
  }
  return viewerApi('POST', `/${viewer.id}/watches`, { seriesId, episode })
})
