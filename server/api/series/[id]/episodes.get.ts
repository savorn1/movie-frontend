/**
 * Episodes of a movie-api series for the player: number, link (null when locked) and whether it has
 * subtitles. Sample series need no call (their links come from episodeSource()).
 */
export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) throw createError({ statusCode: 404, message: 'No remote catalog configured' })
  const episodes = await apiEpisodes(Number(getRouterParam(event, 'id')))
  if (!episodes) throw createError({ statusCode: 404, message: 'Series not found' })
  setHeader(event, 'Cache-Control', 'private, max-age=30')
  return episodes.map(e => ({
    number: e.number,
    title: e.title,
    durationSeconds: e.durationSeconds,
    thumbnailUrl: e.thumbnailUrl,
    locked: e.locked,
    videoUrl: e.videoUrl,
    hasSubtitles: !!e.subtitlesUrl
  }))
})
