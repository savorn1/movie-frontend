/** Unlock one VIP episode with coins: { seriesId, episode }. 402 NOT_ENOUGH_COINS when short. */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'unlock', 30, 60_000)
  const body = await readBody<{ seriesId?: unknown; episode?: unknown }>(event)
  if (!Number.isInteger(body?.seriesId) || !Number.isInteger(body?.episode)) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, episode }' })
  }
  return viewerApi('POST', `/${viewer.id}/unlocks`, { seriesId: body.seriesId, episode: body.episode })
})
