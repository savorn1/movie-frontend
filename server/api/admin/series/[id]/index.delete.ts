export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const movie = await requireSeries(getRouterParam(event, 'id'))
  await saveCatalog((await getCatalog()).filter(m => m.id !== movie.id))
  return { ok: true }
})
