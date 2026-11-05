/** Payments that went through after the viewer closed the KHQR screen, not yet acknowledged */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return viewerApi<OrderView[]>('GET', `/${viewer.id}/orders-news`)
})
