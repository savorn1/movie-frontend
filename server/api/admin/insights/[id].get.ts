/*
 * Per-episode funnel for one series: starts, completions, completion rate, and how many of
 * those who finished went on to start the next episode (where viewers drop off).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const movie = await requireSeries(getRouterParam(event, 'id'))
  const raw = await getInsights(movie.id)

  const episodes = Array.from({ length: movie.episodes }, (_, i) => {
    const ep = i + 1
    const s = raw[ep] ?? { starts: 0, completes: 0 }
    const next = raw[ep + 1]
    return {
      ep,
      starts: s.starts,
      completes: s.completes,
      completionRate: s.starts ? s.completes / s.starts : null,
      // Of those who finished this episode, the share who started the next one
      continueRate: ep < movie.episodes && s.completes ? Math.min(1, (next?.starts ?? 0) / s.completes) : null
    }
  })
  return { seriesId: movie.id, title: movie.title, episodes }
})
