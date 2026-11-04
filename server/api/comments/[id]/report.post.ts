/** Report a comment; enough reports hide it until an admin looks */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'comment-report', 20, 60_000)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad comment id' })
  await viewerApi('POST', `/${viewer.id}/comments/${id}/report`)
  return { ok: true }
})
