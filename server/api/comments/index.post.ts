/** Post a comment: { seriesId, episode, body } (signed-in viewers; a few a minute) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'comment', 5, 60_000)
  const body = await readBody<{ seriesId?: unknown; episode?: unknown; body?: unknown }>(event)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!Number.isInteger(body?.seriesId) || !Number.isInteger(body?.episode) || !text || text.length > 500) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, episode, body } (1–500 characters)', data: { code: 'COMMENT_INVALID' } })
  }
  setResponseStatus(event, 201)
  return viewerApi('POST', `/${viewer.id}/comments`, { seriesId: body.seriesId, episode: body.episode, body: text })
})
