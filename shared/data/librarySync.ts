/*
 * The part of a viewer's library that follows their account across devices (useLibrary keeps it,
 * the sync plugin saves it through /api/library). Player settings stay per device: data saver and
 * speed depend on the phone and the connection.
 */

export interface SyncedHistoryEntry {
  id: number
  ep: number
  at: number
  time?: number
  duration?: number
}

export interface SyncedLibrary {
  history: SyncedHistoryEntry[]
  favorites: number[]
  following: number[]
  unlocked: number[]
  recentSearches: string[]
  seen: Record<number, number>
  ratings: Record<string, 1 | -1>
}

export const EMPTY_LIBRARY: SyncedLibrary = {
  history: [],
  favorites: [],
  following: [],
  unlocked: [],
  recentSearches: [],
  seen: {},
  ratings: {}
}

const ids = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x > 0) : [])
const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])]

/** Whatever came back from the server or storage, made safe to use */
export function cleanLibrary(raw: unknown): SyncedLibrary {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const history = Array.isArray(r.history)
    ? (r.history as SyncedHistoryEntry[]).filter(h => h && Number.isInteger(h.id) && Number.isInteger(h.ep) && typeof h.at === 'number')
    : []
  const seen: Record<number, number> = {}
  if (r.seen && typeof r.seen === 'object') {
    for (const [k, v] of Object.entries(r.seen)) if (Number.isInteger(+k) && Number.isInteger(v)) seen[+k] = v as number
  }
  const ratings: Record<string, 1 | -1> = {}
  if (r.ratings && typeof r.ratings === 'object') {
    for (const [k, v] of Object.entries(r.ratings)) if (/^\d+:\d+$/.test(k) && (v === 1 || v === -1)) ratings[k] = v
  }
  return {
    history: history.slice(0, 30),
    favorites: ids(r.favorites),
    following: ids(r.following),
    unlocked: ids(r.unlocked),
    recentSearches: Array.isArray(r.recentSearches) ? r.recentSearches.filter((s): s is string => typeof s === 'string').slice(0, 8) : [],
    seen,
    ratings
  }
}

/**
 * This device's library merged with the account's, the first time they meet after signing in:
 * lists are combined (this device's order first), each series keeps its most recent history entry,
 * "seen" episode counts keep the higher one, and this device's votes win over older ones.
 */
export function mergeLibraries(local: SyncedLibrary, remote: SyncedLibrary): SyncedLibrary {
  const byId = new Map<number, SyncedHistoryEntry>()
  for (const h of [...local.history, ...remote.history]) {
    const known = byId.get(h.id)
    if (!known || h.at > known.at) byId.set(h.id, h)
  }
  const seen: Record<number, number> = { ...remote.seen }
  for (const [k, v] of Object.entries(local.seen)) seen[+k] = Math.max(v, seen[+k] ?? 0)
  return {
    history: [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 30),
    favorites: union(local.favorites, remote.favorites),
    following: union(local.following, remote.following),
    unlocked: union(local.unlocked, remote.unlocked),
    recentSearches: union(local.recentSearches, remote.recentSearches).slice(0, 8),
    seen,
    ratings: { ...remote.ratings, ...local.ratings }
  }
}
