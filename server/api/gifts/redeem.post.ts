/** Redeem a gift code: { code } → its coins or VIP time are added to this account, once */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'gift-redeem', 10, 10 * 60_000)
  const body = await readBody<{ code?: unknown }>(event)
  const code = typeof body?.code === 'string' ? body.code.replace(/[^0-9A-Za-z-\s]/g, '').slice(0, 24) : ''
  if (code.replace(/[\s-]/g, '').length < 6) {
    throw createError({ statusCode: 400, message: 'Expected { code }', data: { code: 'NO_GIFT' } })
  }
  return viewerApi('POST', `/${viewer.id}/gifts/redeem`, { code })
})
