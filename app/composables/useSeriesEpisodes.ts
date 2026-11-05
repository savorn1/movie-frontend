/** One episode of a movie-api series, as this viewer may see it */
export interface SeriesEpisode {
  number: number
  title: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  /** This viewer can't watch it: a VIP episode they haven't paid for */
  locked: boolean
  /** A VIP episode, paid for or not */
  premium: boolean
  videoUrl: string | null
  hasSubtitles: boolean
  /** The first VIP episode while locked: a link to its opening and how many seconds may be watched */
  preview: { url: string; seconds: number } | null
}

/**
 * Episode links of movie-api series, per viewer, shared by the watch page, the episode grid and the
 * unlock wall. The server decides what this viewer may watch (VIP time, a bought series, episodes
 * unlocked with coins); `reload` asks again, e.g. right after a payment.
 */
export function useSeriesEpisodes() {
  const store = useState<Record<number, SeriesEpisode[]>>('series-episodes', () => ({}))

  async function reload(seriesId: number) {
    const episodes = await $fetch<SeriesEpisode[]>(`/api/series/${seriesId}/episodes`)
    store.value = { ...store.value, [seriesId]: episodes }
    return episodes
  }

  const episodesOf = (seriesId: number) => store.value[seriesId]
  /** Known to be watchable by this viewer (false while not loaded) */
  const isOpen = (seriesId: number, ep: number) => !!store.value[seriesId]?.some(e => e.number === ep && !e.locked)

  return { store, reload, episodesOf, isOpen }
}
