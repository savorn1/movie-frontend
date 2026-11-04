/*
 * Start a KHQR payment: { kind: 'COINS', coins } | { kind: 'SERIES', seriesId } | { kind: 'VIP', months }.
 * The answer has the KHQR to scan; the page then polls GET /api/orders/<id> until it's paid.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'orders', 10, 10 * 60_000)
  const body = await readBody<{ kind?: unknown; coins?: unknown; months?: unknown; seriesId?: unknown }>(event)
  if (!['COINS', 'SERIES', 'VIP'].includes(String(body?.kind))) {
    throw createError({ statusCode: 400, message: 'Unknown product', data: { code: 'NO_PRODUCT' } })
  }
  const order = await viewerApi<OrderView>('POST', `/${viewer.id}/orders`, {
    kind: body.kind,
    ...(Number.isInteger(body.coins) ? { coins: body.coins } : {}),
    ...(Number.isInteger(body.months) ? { months: body.months } : {}),
    ...(Number.isInteger(body.seriesId) ? { seriesId: body.seriesId } : {})
  })
  setResponseStatus(event, 201)
  return withQr(order)
})
