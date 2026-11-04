/** The signed-in viewer's latest coin changes */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  return viewerApi('GET', `/${viewer.id}/coins`)
})
