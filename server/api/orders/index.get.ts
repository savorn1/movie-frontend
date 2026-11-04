/** The signed-in viewer's payments, newest first */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const orders = await viewerApi<OrderView[]>('GET', `/${viewer.id}/orders`)
  return orders.map(o => ({ ...o, khqr: null }))
})
