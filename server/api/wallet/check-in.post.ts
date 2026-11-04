/** Today's check-in coins (409 ALREADY_CHECKED_IN after the first) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'check-in', 10, 60_000)
  return viewerApi('POST', `/${viewer.id}/check-in`)
})
