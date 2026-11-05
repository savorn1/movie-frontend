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
  // Links are made for this browser (and viewer), so never shared through a cache
  setHeader(event, 'Cache-Control', 'private, no-store')
  const seriesId = Number(getRouterParam(event, 'id'))
  // The storage address stays on the server: the player gets a short-lived /media link (utils/mediaGuard)
  const guarded = (url: string | null, ep: number, kind: 'full' | 'preview', premium: boolean) =>
    !url ? null : isPlaylist(url) ? url : mediaLink(event, { s: seriesId, e: ep, k: kind, ...(premium && viewer ? { v: viewer.id } : {}) })
  return episodes.map(e => ({
    number: e.number,
    title: e.title,
    durationSeconds: e.durationSeconds,
    thumbnailUrl: e.thumbnailUrl,
    locked: e.locked,
    premium: e.premium ?? e.locked,
    videoUrl: guarded(e.videoUrl, e.number, 'full', !!(e.premium ?? e.locked)),
    hasSubtitles: !!e.subtitlesUrl,
    preview: e.preview ? { url: guarded(e.preview.url, e.number, 'preview', false)!, seconds: e.preview.seconds } : null,
    /** When these links stop working; the player asks for fresh ones before then */
    linksExpireAt: Date.now() + TOKEN_MINUTES * 60_000
  }))
})
