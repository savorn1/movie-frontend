/** Edit a series' details (only the fields sent are changed) */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const movie = await requireSeries(getRouterParam(event, 'id'))
  const changes = parseSeriesInput(await readBody<Record<string, unknown>>(event), true)
  if (changes.freeEpisodes !== undefined && changes.freeEpisodes > movie.episodes) changes.freeEpisodes = movie.episodes

  const list = await getCatalog()
  const updated = { ...movie, ...changes }
  await saveCatalog(list.map(m => (m.id === movie.id ? updated : m)))
  return (await findSeries(movie.id))!
})
