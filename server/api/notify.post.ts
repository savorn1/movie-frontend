/*
 * Tell every follower of a series that a new episode is out. Call it from your upload flow:
 *   curl -X POST <SITE>/api/notify -H "Authorization: Bearer <NUXT_NOTIFY_SECRET>" \
 *        -H "Content-Type: application/json" -d '{"seriesId": 12, "ep": 9}'
 */
export default defineEventHandler(async (event) => {
  const { notifySecret } = useRuntimeConfig(event)
  if (!notifySecret || getHeader(event, 'authorization') !== `Bearer ${notifySecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<{ seriesId?: number; ep?: number }>(event)
  const movie = await findSeries(Number(body?.seriesId))
  const ep = Number(body?.ep)
  if (!movie || !Number.isInteger(ep) || ep < 1) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, ep } for an existing series' })
  }
  // A call with the secret is a person asking (the admin portal or a script), not the automatic check
  return notifyNewEpisode(movie, ep, 'MANUAL')
})
