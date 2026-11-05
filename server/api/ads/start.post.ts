/**
 * Start a sponsor ad to unlock one VIP episode: { seriesId, episode } → { viewId, ad, left }.
 * The episode opens only after POST /api/ads/<viewId>/complete, once the ad has played long enough.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'ads', 20, 60 * 60_000)
  const body = await readBody<{ seriesId?: unknown; episode?: unknown }>(event)
  if (!Number.isInteger(body?.seriesId) || !Number.isInteger(body?.episode)) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, episode }' })
  }
  return viewerApi('POST', `/${viewer.id}/ads`, { seriesId: body.seriesId, episode: body.episode })
})
