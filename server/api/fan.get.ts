/** This viewer's fan level and badges (Me page) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  return viewerApi('GET', `/${viewer.id}/fan`)
})
