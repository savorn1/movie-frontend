/** Delete one of your own comments */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad comment id' })
  await viewerApi('DELETE', `/${viewer.id}/comments/${id}`)
  return { ok: true }
})
