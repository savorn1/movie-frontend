/** Per-episode 👍/👎 totals for one series: { "1": { up, down }, ... } */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, message: 'Bad series id' })
  return ratingsOf(id)
})
