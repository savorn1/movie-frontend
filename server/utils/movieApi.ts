import { artworkFor, DEFAULT_PRICES, FREE_EPISODES, normalizeMovie, type Category, type HomeRow, type Movie, type SitePrices } from '#shared/data/movies'

/*
 * Client for movie-api (the Nest backend), the source of series, episodes and viewer data when
 * NUXT_MOVIE_API_BASE is set. movie-api reads VideoLingo's database: content is managed in
 * videolingo-web, where a PUBLIC collection with "Show on RuengFlix" on is a series and its released
 * videos, in order, are the episodes. Every call carries NUXT_MOVIE_API_TOKEN.
 */

interface ApiSeries {
  id: number
  slug: string
  title: string
  description: string | null
  posterUrl: string | null
  bannerUrl: string | null
  verticalUrl: string | null
  category: 'CULTIVATION' | 'ROMANCE' | 'FANTASY' | null
  status: 'ONGOING' | 'COMPLETED' | null
  vip: boolean
  freeEpisodes: number
  recapSeconds: number
  searchKeywords: string | null
  region: string | null
  releaseYear: number | null
  genres: string[]
  episodes: number
  /** ISO instants */
  latestEpisodeAt: string | null
  nextEpisodeAt: string | null
  /** Hero slider place (1 first); null = not a hero pick */
  featuredRank: number | null
  /** A promotion makes this VIP series free for everyone until then (ISO), with its banner title */
  freeUntil?: string | null
  promoTitle?: string | null
}

export interface ApiEpisode {
  number: number
  videoId: number
  title: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  /** This viewer can't watch it (a VIP episode they haven't paid for) */
  locked: boolean
  /** A VIP episode, paid for or not */
  premium: boolean
  /** Signed link; null for locked VIP episodes */
  videoUrl: string | null
  /** Path on movie-api; null when locked or without published subtitles */
  subtitlesUrl: string | null
  /** The first VIP episode while locked: its opening, to watch before paying */
  preview?: { url: string; seconds: number } | null
  /** Khmer voice-over track; null when locked or there is none */
  dubUrl?: string | null
}

interface ApiDetail {
  series: ApiSeries
  episodes: ApiEpisode[]
}

const TTL_MS = 30_000
const cache = new Map<string, { at: number; data: unknown }>()
const inflight = new Map<string, Promise<unknown>>()

export const movieApiBase = () => useRuntimeConfig().movieApiBase.replace(/\/$/, '')
/** Set: catalog and viewer data come from movie-api. Unset: sample series and .data on this server. */
export const movieApiEnabled = () => !!movieApiBase()
export const authHeaders = () => ({ Authorization: `Bearer ${useRuntimeConfig().movieApiToken}` })

/**
 * GET a catalog endpoint with a short cache. If movie-api is unreachable the last good copy is served
 * (the site keeps working); with nothing cached the error propagates. 404 resolves to null.
 */
async function apiGet<T>(path: string): Promise<T | null> {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T
  // One request per path at a time, so a burst of visitors at expiry doesn't stampede movie-api
  const running = inflight.get(path)
  if (running) return running as Promise<T | null>

  const request = (async () => {
    try {
      const data = (await $fetch(`${movieApiBase()}${path}`, { headers: authHeaders(), timeout: 5000 })) as T
      cache.set(path, { at: Date.now(), data })
      return data
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) {
        cache.set(path, { at: Date.now(), data: null })
        return null
      }
      if (hit) {
        console.warn(`[movie-api] ${path} failed, serving the cached copy:`, (err as Error).message)
        return hit.data as T
      }
      throw createError({ statusCode: 502, message: `movie-api is unreachable (${path})` })
    } finally {
      inflight.delete(path)
    }
  })()
  inflight.set(path, request)
  return request
}

const toMs = (iso: string | null) => (iso ? new Date(iso).getTime() : null)

export function toMovie(s: ApiSeries): Movie {
  const placeholder = artworkFor(s.id)
  const poster = s.posterUrl ?? placeholder.poster
  const latest = toMs(s.latestEpisodeAt) ?? Date.now()
  return normalizeMovie({
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    episode: '',
    episodes: s.episodes,
    year: s.releaseYear ?? new Date(latest).getFullYear(),
    region: s.region ?? '',
    genres: s.genres,
    latin: s.searchKeywords ?? '',
    category: (s.category?.toLowerCase() ?? 'fantasy') as Category,
    poster,
    vertical: s.verticalUrl ?? poster,
    banner: s.bannerUrl ?? s.posterUrl ?? placeholder.banner,
    vip: s.vip,
    freeEpisodes: s.vip ? s.freeEpisodes : FREE_EPISODES,
    status: s.status === 'COMPLETED' ? 'completed' : 'ongoing',
    recapSeconds: s.recapSeconds,
    updatedAt: latest,
    nextEpisodeAt: toMs(s.nextEpisodeAt),
    featuredRank: s.featuredRank ?? null,
    freeUntil: toMs(s.freeUntil ?? null),
    promoTitle: s.promoTitle ?? null,
    remote: true
  })
}

/** Drops the cached catalog, so the next request reads movie-api again (POST /api/refresh) */
export function clearMovieApiCache() {
  cache.clear()
}

/** Prices set in videolingo-web; the defaults while movie-api has never answered */
export async function apiSite(): Promise<{ prices: SitePrices; homeRows: HomeRow[] }> {
  const site = await apiGet<{ prices: SitePrices; homeRows?: HomeRow[] }>('/site')
  // An older movie-api sends no rows: Home keeps its built-in ones
  return { prices: site?.prices ?? DEFAULT_PRICES, homeRows: site?.homeRows ?? [] }
}

export async function apiSeriesList() {
  return ((await apiGet<ApiSeries[]>('/series')) ?? []).map(toMovie)
}

/** Episodes of one series (null when it isn't listed) */
/**
 * Episodes of one series (null when it isn't listed). With a signed-in viewer, the VIP episodes they
 * paid for come with links; that answer is theirs alone, so it isn't cached.
 */
export async function apiEpisodes(seriesId: number, viewerId?: number) {
  if (!viewerId) return (await apiGet<ApiDetail>(`/series/${seriesId}`))?.episodes ?? null
  try {
    return (await apiCall<ApiDetail>('GET', `/series/${seriesId}?viewer=${viewerId}`)).episodes
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) return null
    throw err
  }
}

/** WebVTT for one episode, passed through this server (movie-api is never called from browsers) */
export async function apiSubtitles(seriesId: number, ep: number, viewerId?: number) {
  const episode = (await apiEpisodes(seriesId, viewerId))?.find(e => e.number === ep)
  if (!episode?.subtitlesUrl) return null
  const viewer = viewerId ? `?viewer=${viewerId}` : ''
  try {
    return await $fetch<string>(`${movieApiBase()}${episode.subtitlesUrl}${viewer}`, { headers: authHeaders(), responseType: 'text', timeout: 5000 })
  } catch {
    return null
  }
}

/** A movie-api GET shared by every visitor (schedule, suggestions), cached for 30 seconds */
export const apiCached = <T>(path: string) => apiGet<T>(path)

/*
 * Viewer data endpoints (votes, plays, reports, follows, alerts), never cached.
 * 404 (series not listed, episode not released) passes through; anything else is a 502.
 */
/**
 * A movie-api call whose 4xx errors keep their status and `code` (for Khmer messages in the browser),
 * like viewerApi but for paths outside /viewers (gifts, clips, promotions).
 */
export async function codedApi<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: object): Promise<T> {
  try {
    return (await $fetch(`${movieApiBase()}${path}`, { method, body, headers: authHeaders(), timeout: 8000 })) as T
  } catch (err) {
    const e = err as { statusCode?: number; data?: { code?: string; message?: string | string[] } }
    if (e.statusCode && e.statusCode < 500) {
      const message = Array.isArray(e.data?.message) ? e.data.message.join('; ') : (e.data?.message ?? 'Request failed')
      throw createError({ statusCode: e.statusCode, message, data: { code: e.data?.code } })
    }
    console.warn(`[movie-api] ${method} ${path} failed:`, e.statusCode ?? (err as Error).message)
    throw createError({ statusCode: 502, message: 'movie-api is unreachable', data: { code: 'UNREACHABLE' } })
  }
}

export async function apiCall<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: object): Promise<T> {
  try {
    return (await $fetch(`${movieApiBase()}${path}`, { method, body, headers: authHeaders(), timeout: 5000 })) as T
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404) throw createError({ statusCode: 404, message: 'Series or episode not found' })
    console.warn(`[movie-api] ${method} ${path} failed:`, status ?? (err as Error).message)
    throw createError({ statusCode: 502, message: 'movie-api is unreachable' })
  }
}
