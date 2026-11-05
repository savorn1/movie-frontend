/** Today's missions and how far the signed-in viewer is */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return viewerApi('GET', `/${viewer.id}/missions`)
})
