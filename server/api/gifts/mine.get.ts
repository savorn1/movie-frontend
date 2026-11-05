/** Gifts this viewer bought, with whether each was redeemed */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  return viewerApi('GET', `/${viewer.id}/gifts`)
})
