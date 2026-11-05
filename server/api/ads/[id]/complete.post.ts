/** The ad played to the end: unlock its episode (movie-api checks the time on its own clock) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'ads-complete', 30, 60 * 60_000)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Bad ad id' })
  return viewerApi('POST', `/${viewer.id}/ads/${id}/complete`)
})
