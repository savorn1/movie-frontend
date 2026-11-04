/** ?series=<id>&ep=<n>: comments under an episode, newest first; `mine` marks the signed-in viewer's own */
export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) return { total: 0, items: [] }
  const q = getQuery(event)
  const series = Number(q.series)
  const ep = Number(q.ep)
  if (!Number.isInteger(series) || !Number.isInteger(ep) || series < 1 || ep < 1) {
    throw createError({ statusCode: 400, message: 'Expected ?series=<id>&ep=<n>' })
  }
  const viewer = await currentViewer(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return apiCall('GET', `/series/${series}/episodes/${ep}/comments${viewer ? `?viewer=${viewer.id}` : ''}`)
})
