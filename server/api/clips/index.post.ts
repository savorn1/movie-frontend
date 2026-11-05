/**
 * Share a moment: { seriesId, episode, at, seconds? } → a clip of the seconds before `at` (up to 15),
 * cut by VideoLingo. Anyone may clip an episode they can watch; the answer starts as PENDING, poll
 * GET /api/clips/<code> until READY.
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'clips', 6, 10 * 60_000)
  const body = await readBody<{ seriesId?: unknown; episode?: unknown; at?: unknown; seconds?: unknown }>(event)
  const at = Number(body?.at)
  if (!Number.isInteger(body?.seriesId) || !Number.isInteger(body?.episode) || !Number.isFinite(at) || at < 0) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, episode, at }' })
  }
  const viewer = await currentViewer(event).catch(() => null)
  const seconds = Number.isInteger(body.seconds) ? Math.min(15, Math.max(3, body.seconds as number)) : 15
  setResponseStatus(event, 201)
  return codedApi('POST', `/clips${viewer ? `?viewer=${viewer.id}` : ''}`, {
    seriesId: body.seriesId,
    episode: body.episode,
    at: Math.floor(at),
    seconds
  })
})
