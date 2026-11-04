/*
 * Per-episode plays for /admin Insights. Kept in VideoLingo's database through movie-api when
 * movieApiEnabled(), else in .data:
 *   series:<id> -> { "<ep>": { starts, completes } }
 */
export interface EpisodeStats {
  starts: number
  completes: number
}

/** One row of movie-api's /series/{id}/stats, which holds both plays and votes */
export interface ApiEpisodeStats {
  episode: number
  starts: number
  completes: number
  likes: number
  dislikes: number
}

const key = (seriesId: number) => `series:${seriesId}`

/** { "<ep>": { starts, completes } } for one series */
export async function getInsights(seriesId: number): Promise<Record<string, EpisodeStats>> {
  if (movieApiEnabled()) {
    const stats = await apiCall<ApiEpisodeStats[]>('GET', `/series/${seriesId}/stats`)
    return Object.fromEntries(stats.map(s => [s.episode, { starts: s.starts, completes: s.completes }]))
  }
  return (await useStorage('insights').getItem<Record<string, EpisodeStats>>(key(seriesId))) ?? {}
}

export async function recordPlay(seriesId: number, ep: number, kind: 'start' | 'complete') {
  if (movieApiEnabled()) {
    await apiCall('POST', '/plays', { seriesId, episode: ep, event: kind.toUpperCase() })
    return
  }
  const all = await getInsights(seriesId)
  const s = all[ep] ?? { starts: 0, completes: 0 }
  if (kind === 'start') s.starts++
  else s.completes++
  all[ep] = s
  await useStorage('insights').setItem(key(seriesId), all)
}
