/** A gift as its link shows it: what's inside, who sent it, whether it's still there */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'gift-look', 60, 60_000)
  const code = String(getRouterParam(event, 'code') ?? '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 24)
  if (code.length < 6) throw createError({ statusCode: 404, message: 'No such gift', data: { code: 'NO_GIFT' } })
  const gift = await codedApi<{ giverId: number | null }>('GET', `/gifts/${code}`)
  const viewer = await currentViewer(event).catch(() => null)
  const { giverId, ...rest } = gift
  // Only the sender learns it's theirs (to show "send this to a friend" instead of "redeem")
  return { ...rest, mine: !!viewer && giverId === viewer.id }
})
