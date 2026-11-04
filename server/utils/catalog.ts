import { sampleCatalog, type Movie } from '#shared/data/movies'

/*
 * The catalog: from movie-api when NUXT_MOVIE_API_BASE is set (content managed in videolingo-web),
 * otherwise the sample series, seeded into Nitro storage on first run.
 */
const store = () => useStorage('catalog')
const KEY = 'series'
const KNOWN = 'known-episodes'

export async function getCatalog(): Promise<Movie[]> {
  if (movieApiEnabled()) {
    const list = await apiSeriesList()
    await alertNewEpisodes(list)
    return list
  }
  const local = await store().getItem<Movie[]>(KEY)
  if (local?.length) return local
  const seed = sampleCatalog()
  await store().setItem(KEY, seed)
  return seed
}

export async function findSeries(id: number) {
  return (await getCatalog()).find(m => m.id === id)
}

/** 404 unless the series exists */
export async function requireSeries(id: unknown) {
  const movie = await findSeries(Number(id))
  if (!movie) throw createError({ statusCode: 404, message: 'Series not found' })
  return movie
}

/*
 * Telegram "new episode" alerts. Episodes are published in VideoLingo (now or at a scheduled time),
 * so RuengFlix notices them here: when a series has more episodes than last seen, its followers get
 * one alert for the newest episode. The first look at a series only records its count.
 *
 * With movie-api, the last-alerted counts live in VideoLingo's database and movie-api hands each new
 * episode to exactly one caller, so several RuengFlix instances never send the same alert twice. This
 * process only asks when a count differs from what it last saw. Without movie-api they live in .data.
 */
let checking: Promise<void> | null = null
const seen = new Map<number, number>()

async function alertNewEpisodes(list: Movie[]) {
  // One comparison at a time, so two requests can't both alert for the same episode
  while (checking) await checking
  checking = (async () => {
    const fresh = movieApiEnabled() ? await claimRemote(list) : await claimLocal(list)
    for (const m of fresh) console.info(`[alerts] ${m.title} (#${m.id}): episode ${m.episodes} is out`)
    if (!fresh.length || !useRuntimeConfig().telegramBotToken) return
    // Don't hold up the page: send in the background
    for (const m of fresh) {
      notifyNewEpisode(m, m.episodes).catch(err => console.warn(`[alerts] ${m.title}:`, (err as Error).message))
    }
  })()
  try {
    await checking
  } finally {
    checking = null
  }
}

async function claimRemote(list: Movie[]) {
  const fresh: Movie[] = []
  for (const m of list) {
    if (seen.get(m.id) === m.episodes) continue
    try {
      const claim = await apiCall<{ alert: boolean; episodes: number }>('POST', `/series/${m.id}/alerts`)
      seen.set(m.id, m.episodes)
      if (claim.alert) fresh.push({ ...m, episodes: claim.episodes })
    } catch {
      // movie-api is unreachable or the series was just unlisted: try again on a later request
    }
  }
  return fresh
}

async function claimLocal(list: Movie[]) {
  const known = (await store().getItem<Record<number, number>>(KNOWN)) ?? {}
  const fresh: Movie[] = []
  for (const m of list) {
    const before = known[m.id]
    if (before !== undefined && m.episodes > before) fresh.push(m)
    known[m.id] = Math.max(before ?? 0, m.episodes)
  }
  await store().setItem(KNOWN, known)
  return fresh
}
