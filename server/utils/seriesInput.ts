import type { Category, Movie } from '#shared/data/movies'

type Editable = Pick<Movie, 'title' | 'description' | 'latin' | 'category' | 'genres' | 'vip'
  | 'freeEpisodes' | 'status' | 'recapSeconds' | 'year' | 'region'>

const CATEGORIES: Category[] = ['cultivation', 'romance', 'fantasy']
const STATUSES: Movie['status'][] = ['ongoing', 'completed']

/**
 * Validate admin input for a series. `partial` (edits) only checks the fields that were sent.
 * Throws 400 listing every problem, so the form can show them all at once.
 */
export function parseSeriesInput(body: Record<string, unknown>, partial: boolean): Partial<Editable> {
  const out: Partial<Editable> = {}
  const problems: string[] = []
  const has = (k: string) => body[k] !== undefined
  const need = (k: string) => !partial || has(k)

  const str = (k: keyof Editable, min: number, max: number) => {
    if (!need(k)) return
    const v = typeof body[k] === 'string' ? (body[k] as string).trim() : ''
    if (v.length < min || v.length > max) problems.push(`${k}: ${min}–${max} characters`)
    else (out as Record<string, unknown>)[k] = v
  }
  const int = (k: keyof Editable, min: number, max: number) => {
    if (!need(k)) return
    const v = Number(body[k])
    if (!Number.isInteger(v) || v < min || v > max) problems.push(`${k}: whole number ${min}–${max}`)
    else (out as Record<string, unknown>)[k] = v
  }

  str('title', 1, 120)
  str('description', 0, 1000)
  str('latin', 0, 200)
  str('region', 1, 40)
  int('freeEpisodes', 0, 100)
  int('recapSeconds', 0, 300)
  int('year', 1990, 2100)

  if (need('category')) {
    if (CATEGORIES.includes(body.category as Category)) out.category = body.category as Category
    else problems.push(`category: one of ${CATEGORIES.join(', ')}`)
  }
  if (need('status')) {
    if (STATUSES.includes(body.status as Movie['status'])) out.status = body.status as Movie['status']
    else problems.push(`status: one of ${STATUSES.join(', ')}`)
  }
  if (need('vip')) {
    if (typeof body.vip === 'boolean') out.vip = body.vip
    else problems.push('vip: true or false')
  }
  if (need('genres')) {
    const list = Array.isArray(body.genres) ? body.genres : String(body.genres ?? '').split(',')
    const genres = list.map(g => String(g).trim()).filter(Boolean)
    if (!genres.length || genres.length > 5 || genres.some(g => g.length > 60)) problems.push('genres: 1–5, each up to 60 characters')
    else out.genres = genres
  }

  if (problems.length) throw createError({ statusCode: 400, message: problems.join('; '), data: { problems } })
  return out
}

/** Episode video links must be http(s) URLs */
export function parseVideoUrl(v: unknown) {
  if (v === undefined || v === null || v === '') return undefined
  try {
    const url = new URL(String(v))
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString()
  } catch {}
  throw createError({ statusCode: 400, message: 'videoUrl: a full http(s) link to an .m3u8 or .mp4 file' })
}
