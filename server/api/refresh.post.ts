/*
 * Drop the cached catalog so changes made in videolingo-web show at once instead of within a minute.
 * Called by the admin portal's "Refresh RuengFlix" button (VideoLingo, RUENGFLIX_NOTIFY_SECRET):
 *   curl -X POST <SITE>/api/refresh -H "Authorization: Bearer <NUXT_NOTIFY_SECRET>"
 */
export default defineEventHandler(async (event) => {
  const { notifySecret } = useRuntimeConfig(event)
  if (!notifySecret || getHeader(event, 'authorization') !== `Bearer ${notifySecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  clearMovieApiCache()
  // Read it again now, which also runs the new-episode check
  const series = movieApiEnabled() ? (await getCatalog()).length : null
  return { refreshed: true, series }
})
