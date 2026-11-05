/** One payment, brought up to date (movie-api asks Bakong whether it was paid) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'order-status', 120, 60_000)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Bad order id' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return withQr(await viewerApi<OrderView>('GET', `/${viewer.id}/orders/${id}`))
})
