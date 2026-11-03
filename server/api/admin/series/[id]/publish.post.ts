/*
 * Publish the next episode: bumps the episode count, stores its video link (optional; without one
 * the sample clips play), moves the series to the top of "Latest", and optionally sends the
 * Telegram alert to everyone following it.
 *   POST { videoUrl?: string, notify?: boolean }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const movie = await requireSeries(getRouterParam(event, 'id'))
  const body = await readBody<{ videoUrl?: string; notify?: boolean }>(event)
  const videoUrl = parseVideoUrl(body?.videoUrl)

  const ep = movie.episodes + 1
  const updated = {
    ...movie,
    episodes: ep,
    sources: videoUrl ? { ...movie.sources, [ep]: videoUrl } : movie.sources,
    updatedAt: Date.now()
  }
  await saveCatalog((await getCatalog()).map(m => (m.id === movie.id ? updated : m)))

  let notified: Awaited<ReturnType<typeof notifyNewEpisode>> | { skipped: string } | null = null
  if (body?.notify) {
    notified = useRuntimeConfig(event).telegramBotToken
      ? await notifyNewEpisode(updated, ep)
      : { skipped: 'Telegram bot token is not configured' }
  }
  return { series: (await findSeries(movie.id))!, episode: ep, notified }
})
