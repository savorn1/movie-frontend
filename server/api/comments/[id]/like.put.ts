/** Like or unlike a comment ({ like: boolean }); returns the new count */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'comment-like', 60, 60_000)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad comment id' })
  const body = await readBody<{ like?: unknown }>(event)
  if (typeof body?.like !== 'boolean') throw createError({ statusCode: 400, message: 'like must be true or false' })
  return viewerApi<{ likes: number; liked: boolean }>('PUT', `/${viewer.id}/comments/${id}/like`, { like: body.like })
})
