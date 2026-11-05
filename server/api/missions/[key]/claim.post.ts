/** Collect a finished mission's coins (once a day) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'mission-claim', 20, 60_000)
  const key = String(getRouterParam(event, 'key') ?? '')
  if (!/^[A-Z0-9_]{2,30}$/.test(key)) throw createError({ statusCode: 400, message: 'Bad mission' })
  return viewerApi('POST', `/${viewer.id}/missions/${key}/claim`)
})
