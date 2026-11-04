/** Turn this browser's new-episode push for one series on or off: { endpoint, seriesId, follow } */
export default defineEventHandler(async (event) => {
  if (!pushEnabled()) throw createError({ statusCode: 503, message: 'Push is not set up' })
  rateLimit(event, 'push-follow', 60, 60_000)
  const body = await readBody<{ endpoint?: unknown; seriesId?: unknown; follow?: unknown }>(event)
  if (typeof body?.endpoint !== 'string' || !Number.isInteger(body.seriesId) || typeof body.follow !== 'boolean') {
    throw createError({ statusCode: 400, message: 'Expected { endpoint, seriesId, follow }' })
  }
  await apiCall('POST', '/push/follows', { endpoint: body.endpoint, seriesId: body.seriesId, follow: body.follow })
  return { following: body.follow }
})
