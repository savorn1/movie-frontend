/** Count a search someone made (for "trending searches") */
export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) return { counted: false }
  rateLimit(event, 'search-log', 30, 60_000)
  const body = await readBody<{ term?: unknown }>(event)
  if (typeof body?.term !== 'string') throw createError({ statusCode: 400, message: 'term is required' })
  return apiCall('POST', '/search/terms', { term: body.term.slice(0, 200) })
})
