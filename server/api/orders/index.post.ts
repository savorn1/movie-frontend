/*
 * Start a KHQR payment: { kind: 'COINS', coins } | { kind: 'SERIES', seriesId } | { kind: 'VIP', months }.
 * `gift: true` (coins or VIP, with an optional `giftMessage`) buys it for someone else: paying makes a code.
 * The answer has the KHQR to scan; the page then polls GET /api/orders/<id> until it's paid.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'orders', 10, 10 * 60_000)
  const body = await readBody<{ kind?: unknown; coins?: unknown; months?: unknown; seriesId?: unknown; gift?: unknown; giftMessage?: unknown }>(event)
  if (!['COINS', 'SERIES', 'VIP'].includes(String(body?.kind))) {
    throw createError({ statusCode: 400, message: 'Unknown product', data: { code: 'NO_PRODUCT' } })
  }
  const order = await viewerApi<OrderView>('POST', `/${viewer.id}/orders`, {
    kind: body.kind,
    ...(Number.isInteger(body.coins) ? { coins: body.coins } : {}),
    ...(Number.isInteger(body.months) ? { months: body.months } : {}),
    ...(Number.isInteger(body.seriesId) ? { seriesId: body.seriesId } : {}),
    ...(body.gift === true ? { gift: true } : {}),
    ...(body.gift === true && typeof body.giftMessage === 'string' && body.giftMessage.trim()
      ? { giftMessage: body.giftMessage.trim().slice(0, 140) }
      : {})
  })
  setResponseStatus(event, 201)
  return withQr(order)
})
