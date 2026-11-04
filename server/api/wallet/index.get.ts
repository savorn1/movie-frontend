/** The signed-in viewer's coins, VIP time and today's check-in */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return viewerApi('GET', `/${viewer.id}/wallet`)
})
