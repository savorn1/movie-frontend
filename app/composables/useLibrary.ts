import { isLocked, type Movie } from '#shared/data/movies'

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
  /** Subtitle text size; Khmer script needs more room than Latin on phones */
  captionSize?: 's' | 'm' | 'l' | 'xl'
  /** Box behind subtitles */
  captionBg?: 'none' | 'soft' | 'solid'
  /** Lower (default) or higher, clear of burned-in text */
  captionPos?: 'low' | 'high'
  /** Original sound, or the Khmer voice-over when an episode has one */
  voice?: 'original' | 'km'
  /** Comments floating across the picture at the moment they were written (on unless turned off) */
  danmaku?: boolean
  /** Genres picked on the first visit, for "For you" before there's any watching to go on */
  genres?: string[]
  /** The first-visit genre picker was answered or skipped */
  onboarded?: boolean
}

// Per-viewer state kept in localStorage; the library.client plugin loads and persists it.
export function useLibrary() {
  const { find } = useCatalog()
  const history = useState<HistoryEntry[]>('library-history', () => [])
  const favorites = useState<number[]>('library-favorites', () => [])
  const recentSearches = useState<string[]>('library-searches', () => [])
  const following = useState<number[]>('library-following', () => [])
  const unlocked = useState<number[]>('library-unlocked', () => [])
  const prefs = useState<PlayerPrefs>('library-prefs', () => ({
    speed: 1,
    captions: true,
    dataSaver: 'auto',
    captionSize: 'm',
    captionBg: 'soft',
    captionPos: 'low'
  }))
  /** Episode count each followed series had when last opened; anything above it is "new" */
  const seen = useState<Record<number, number>>('library-seen', () => ({}))
  /** This viewer's vote per episode, keyed "seriesId:ep" */
  const ratings = useState<Record<string, 1 | -1>>('library-ratings', () => ({}))

  const continueWatching = computed(() =>
    history.value
      .map(h => ({ entry: h, movie: find(h.id) }))
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
    const m = find(id)
    if (m && isFollowing(id) && seen.value[id] !== m.episodes) seen.value = { ...seen.value, [id]: m.episodes }
  }

  /** New episodes in a followed series since it was last opened */
  function newEpisodes(id: number) {
    const m = find(id)
    if (!m || !isFollowing(id)) return 0
    return Math.max(0, m.episodes - (seen.value[id] ?? m.episodes))
  }

  const totalNew = computed(() => following.value.reduce((n, id) => n + newEpisodes(id), 0))

  /**
   * Has something this viewer hasn't seen: new episodes in a followed series, or episodes published
   * after they last watched a series they've started and not caught up on
   */
  function hasNew(id: number) {
    if (newEpisodes(id)) return true
    const m = find(id)
    const h = history.value.find(x => x.id === id)
    return !!m && !!h && m.updatedAt > h.at && m.episodes > h.ep
  }

  /** "New for you" on the home page: followed or started series with unseen episodes, newest first */
  const newForYou = computed(() => {
    const ids = [...new Set([...following.value, ...history.value.map(h => h.id)])]
    return ids
      .filter(hasNew)
      .map(id => find(id)!)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  })

  /**
   * Free episodes, or VIP episodes this viewer paid for. For movie-api series only the server's answer
   * counts (useSeriesEpisodes); the sample series use this browser's unlock list.
   */
  const { isOpen } = useSeriesEpisodes()
  const canWatch = (m: Movie, ep: number) =>
    !isLocked(m, ep) || (m.remote ? isOpen(m.id, ep) : unlocked.value.includes(m.id))
  function unlockSeries(id: number) {
    if (!unlocked.value.includes(id)) unlocked.value = [...unlocked.value, id]
  }

  const ratingOf = (id: number, ep: number) => ratings.value[`${id}:${ep}`]
  /** Set a vote; voting the same way again clears it. Returns the previous vote. */
  function rate(id: number, ep: number, vote: 1 | -1) {
    const key = `${id}:${ep}`
    const previous = ratings.value[key]
    const next = { ...ratings.value }
    if (previous === vote) delete next[key]
    else next[key] = vote
    ratings.value = next
    return previous
  }

  function addRecentSearch(term: string) {
    recentSearches.value = [term, ...recentSearches.value.filter(t => t !== term)].slice(0, 8)
  }

  /** Drop one series from "Continue watching"; returns the entry so it can be restored (Undo) */
  function removeFromHistory(id: number) {
    const index = history.value.findIndex(h => h.id === id)
    const entry = history.value[index]
    if (entry) history.value = history.value.filter(h => h.id !== id)
    return entry ? { entry, index } : null
  }

  function restoreHistory({ entry, index }: { entry: HistoryEntry; index: number }) {
    const list = history.value.filter(h => h.id !== entry.id)
    list.splice(index, 0, entry)
    history.value = list
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
    ratings,
    ratingOf,
    rate,
    markSeen,
    newEpisodes,
    totalNew,
    hasNew,
    newForYou,
    continueWatching,
    recordWatch,
    saveProgress,
    removeFromHistory,
    restoreHistory,
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
