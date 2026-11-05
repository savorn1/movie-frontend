/**
 * Episodes of a movie-api series for the player: number, link (null when this viewer can't watch it),
 * whether it's a VIP episode, and whether it has subtitles. Signed-in viewers get the VIP episodes they
 * paid for. Sample series need no call (their links come from episodeSource()).
 */
export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) throw createError({ statusCode: 404, message: 'No remote catalog configured' })
  const viewer = await currentViewer(event)
  const episodes = await apiEpisodes(Number(getRouterParam(event, 'id')), viewer?.id)
  if (!episodes) throw createError({ statusCode: 404, message: 'Series not found' })
  setHeader(event, 'Cache-Control', viewer ? 'private, no-store' : 'private, max-age=30')
  return episodes.map(e => ({
    number: e.number,
    title: e.title,
    durationSeconds: e.durationSeconds,
    thumbnailUrl: e.thumbnailUrl,
    locked: e.locked,
    premium: e.premium ?? e.locked,
    videoUrl: e.videoUrl,
    hasSubtitles: !!e.subtitlesUrl,
    preview: e.preview ?? null
  }))
})
