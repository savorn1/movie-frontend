/** The viewer saw that this payment went through (on the KHQR screen or the notice) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad order id' })
  await viewerApi('POST', `/${viewer.id}/orders/${id}/seen`)
  return { ok: true }
})
