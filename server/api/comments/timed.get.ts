/** Comments written at a moment of an episode (?series=&ep=), to float over the video as it plays */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const series = Number(q.series)
  const ep = Number(q.ep)
  if (!Number.isInteger(series) || !Number.isInteger(ep) || series < 1 || ep < 1) {
    throw createError({ statusCode: 400, message: 'Expected ?series=&ep=' })
  }
  if (!movieApiEnabled()) return []
  setHeader(event, 'Cache-Control', 'public, max-age=20')
  return codedApi('GET', `/series/${series}/episodes/${ep}/timed-comments`).catch(() => [])
})
