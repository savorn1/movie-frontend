import { isLocked, movies, type Movie } from '#shared/data/movies'

export interface HistoryEntry {
  id: number
  ep: number
  at: number
  /** Seconds into the episode, for resume-to-the-second */
  time?: number
  duration?: number
}

export interface PlayerPrefs {
  speed: number
  captions: boolean
  dataSaver: 'auto' | 'on' | 'off'
}

// Per-viewer state kept in localStorage; the library.client plugin loads and persists it.
export function useLibrary() {
  const history = useState<HistoryEntry[]>('library-history', () => [])
  const favorites = useState<number[]>('library-favorites', () => [])
  const recentSearches = useState<string[]>('library-searches', () => [])
  const following = useState<number[]>('library-following', () => [])
  const unlocked = useState<number[]>('library-unlocked', () => [])
  const prefs = useState<PlayerPrefs>('library-prefs', () => ({ speed: 1, captions: true, dataSaver: 'auto' }))
  /** Episode count each followed series had when last opened; anything above it is "new" */
  const seen = useState<Record<number, number>>('library-seen', () => ({}))

  const continueWatching = computed(() =>
    history.value
      .map(h => ({ entry: h, movie: movies.find(m => m.id === h.id) }))
      .filter((x): x is { entry: HistoryEntry; movie: Movie } => !!x.movie)
  )

  function recordWatch(id: number, ep: number) {
    const prev = history.value.find(h => h.id === id)
    const keep = prev?.ep === ep ? { time: prev.time, duration: prev.duration } : {}
    history.value = [{ id, ep, at: Date.now(), ...keep }, ...history.value.filter(h => h.id !== id)].slice(0, 30)
  }

  function saveProgress(id: number, ep: number, time: number, duration: number) {
    const entry = history.value.find(h => h.id === id)
    if (entry && entry.ep === ep) {
      entry.time = Math.floor(time)
      entry.duration = Math.floor(duration)
      entry.at = Date.now()
      history.value = [...history.value]
    } else {
      history.value = [{ id, ep, at: Date.now(), time, duration }, ...history.value.filter(h => h.id !== id)].slice(0, 30)
    }
  }

  const lastEpisode = (id: number) => history.value.find(h => h.id === id)?.ep

  /** Saved position for this exact episode, if any */
  function resumeTime(id: number, ep: number) {
    const h = history.value.find(x => x.id === id && x.ep === ep)
    return h?.time && h.duration && h.time < h.duration - 5 ? h.time : 0
  }

  /** Overall series progress 0–1, counting the fraction of the current episode */
  function seriesProgress(entry: HistoryEntry, total: number) {
    const part = entry.time && entry.duration ? entry.time / entry.duration : 0
    return Math.min(1, (entry.ep - 1 + part) / total)
  }

  const isFavorite = (id: number) => favorites.value.includes(id)
  function toggleFavorite(id: number) {
    favorites.value = isFavorite(id) ? favorites.value.filter(f => f !== id) : [id, ...favorites.value]
  }

  const isFollowing = (id: number) => following.value.includes(id)
  function toggleFollow(id: number) {
    if (isFollowing(id)) {
      following.value = following.value.filter(f => f !== id)
    } else {
      following.value = [id, ...following.value]
      markSeen(id)
    }
  }

  /** Call when someone opens a series: its current episodes are no longer "new" */
  function markSeen(id: number) {
    const m = movies.find(x => x.id === id)
    if (m && isFollowing(id) && seen.value[id] !== m.episodes) seen.value = { ...seen.value, [id]: m.episodes }
  }

  /** New episodes in a followed series since it was last opened */
  function newEpisodes(id: number) {
    const m = movies.find(x => x.id === id)
    if (!m || !isFollowing(id)) return 0
    return Math.max(0, m.episodes - (seen.value[id] ?? m.episodes))
  }

  const totalNew = computed(() => following.value.reduce((n, id) => n + newEpisodes(id), 0))

  /** Free episodes, or VIP episodes of a series this viewer unlocked */
  const canWatch = (m: Movie, ep: number) => !isLocked(m, ep) || unlocked.value.includes(m.id)
  function unlockSeries(id: number) {
    if (!unlocked.value.includes(id)) unlocked.value = [...unlocked.value, id]
  }

  function addRecentSearch(term: string) {
    recentSearches.value = [term, ...recentSearches.value.filter(t => t !== term)].slice(0, 8)
  }

  const clearRecentSearches = () => (recentSearches.value = [])
  const clearHistory = () => (history.value = [])

  return {
    history,
    favorites,
    recentSearches,
    following,
    unlocked,
    prefs,
    seen,
    markSeen,
    newEpisodes,
    totalNew,
    continueWatching,
    recordWatch,
    saveProgress,
    lastEpisode,
    resumeTime,
    seriesProgress,
    isFavorite,
    toggleFavorite,
    isFollowing,
    toggleFollow,
    canWatch,
    unlockSeries,
    addRecentSearch,
    clearRecentSearches,
    clearHistory
  }
}
