/** Emoji reactions along an episode (?series&ep), per 5-second bucket */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const series = Number(q.series)
  const ep = Number(q.ep)
  if (!Number.isInteger(series) || !Number.isInteger(ep)) throw createError({ statusCode: 400, message: 'series and ep are required' })
  if (!movieApiEnabled()) return []
  setHeader(event, 'Cache-Control', 'public, max-age=30')
  return apiCall('GET', `/series/${series}/episodes/${ep}/reactions`)
})
