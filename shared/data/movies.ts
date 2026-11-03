const khmerDigits = '០១២៣៤៥៦៧៨៩'
/** Khmer numerals for display text (episodes, counts, years). Prices and player time stay Western. */
export const toKhmerDigits = (n: number | string) => String(n).replace(/\d/g, d => khmerDigits[+d]!)

export type Category = 'cultivation' | 'romance' | 'fantasy'

export interface Movie {
  id: number
  title: string
  description: string
  /** Display label of the latest episode ("វគ្គ ០៥"); derived by normalizeMovie() */
  episode: string
  episodes: number
  year: number
  region: string
  genres: string[]
  /** English + romanised keywords so Latin-keyboard searches ("summer love", "sneha") match */
  latin: string
  category: Category
  poster: string
  vertical: string
  banner: string
  vip: boolean
  /** VIP series: episodes 1..freeEpisodes are free */
  freeEpisodes: number
  status: 'ongoing' | 'completed'
  /** Length of the "previously on" recap at the start of episodes 2+, for the Skip recap button */
  recapSeconds: number
  /** Episode video URLs (HLS .m3u8 or MP4) set when an episode is published; others use samples */
  sources?: Record<number, string>
  /** Last time an episode was published (ms); orders "Latest updates" */
  updatedAt: number
}

/*
 * The live catalog belongs to the server (server/utils/catalog.ts, edited from /admin) and reaches
 * pages through useCatalog(). This file holds the types, the starting content the server seeds
 * itself with, and pure helpers that take the catalog as an argument.
 */

export const categoryLabels: Record<Category, string> = {
  cultivation: 'ក្បាច់គុន',
  romance: 'ស្នេហា',
  fantasy: 'ស្រមើស្រមៃ'
}

export const genrePool: Record<Category, readonly string[]> = {
  cultivation: ['ក្បាច់គុន និងពិភពអមតៈ', 'សងសឹក និងជោគជ័យ', 'យុទ្ធភពបុរាណ'],
  romance: ['ស្នេហា និងមនោសញ្ចេតនា', 'ទីក្រុង និងមហាសេដ្ឋី', 'កើតជាថ្មី និងឆ្លងភព'],
  fantasy: ['រវើរវាយ', 'ដំណើរផ្សងព្រេង', 'អាថ៌កំបាំង']
}

/** Default number of free episodes in a VIP series */
export const FREE_EPISODES = 3

// One-off price to unlock every VIP episode of a single series (vs. the monthly VIP plan)
export const SERIES_UNLOCK_PRICE = 0.49

// Placeholder artwork from picsum, seeded per series so images stay stable across reloads
export const artworkFor = (id: number) => ({
  poster: `https://picsum.photos/seed/ruengflix-${id}/300/420`,
  vertical: `https://picsum.photos/seed/ruengflix-${id}/540/960`,
  banner: `https://picsum.photos/seed/ruengflix-banner-${id}/1600/700`
})

/** Recompute derived fields after any change */
export function normalizeMovie(m: Movie): Movie {
  return { ...m, episode: `វគ្គ ${toKhmerDigits(String(m.episodes).padStart(2, '0'))}` }
}

// ---------- Starting content ----------

const titles = [
  'ដំណើរផ្សងព្រេងនៃវីរបុរស', 'បេះដូងញាប់ញ័រក្នុងរង្វង់ដៃ', 'ស្នេហារដូវក្តៅ', 'អ្នកជិតខាងត្រជាក់ចិត្ត',
  'ស្តេចយ័ន្តនៃភពថ្មី', 'គ្មានឫសវិញ្ញាណក៏ហាត់វិជ្ជាបាន', 'ស្នេហ៍ពិតមេបញ្ជាការ', 'ការកើតជាថ្មីរបស់អភិជន',
  'អង្កាំទិព្វទាំងប្រាំបួន', 'ប្រឡងចប់ក្លាយជាកូនអ្នកមាន', 'ឈោងយកផ្កាយ', 'ល្បែងអុកវាសនា',
  'ភ្នែកខ្វាក់មើលធ្លុះមេឃ', 'មរតកតាវក្នុងខ្លួន', 'កូនទាអាក្រក់ក្លាយជាស្រីស្អាត', 'ទេពបោះបង់ ខ្ញុំក្លាយជាទេព',
  'រដូវក្តៅនៅស្រុកស្រែ', 'មិត្តស្រីរបស់ខ្ញុំជាកូននាគ', 'សិស្សច្បងកំពូលភ្នំ', 'ដៃពិសេសគ្មានដែនកំណត់',
  'ស្នេហ៍នេះមានតែអ្នក', 'ឃាតករស្រីក្បាលខូច', 'និស្ស័យគេចមិនផុត', 'ប្រុសស្អាតគ្រប់ទិសទី'
]

// English meaning plus a few romanised Khmer words per title, in the same order as `titles`
const latinTitles = [
  'hero adventure domnaer phsong preng', 'trembling heart in your arms besdong', 'summer love sneha rodov kdav',
  'cold hearted neighbor neighbour', 'robot mech king new world sdach yon', 'no spirit root cultivation martial',
  'true love commander general sneh pit', 'rebirth noble reborn aristocrat', 'nine divine beads pearls',
  'exam rich kid wealthy heir', 'reach for the stars phkay', 'chess game of fate destiny',
  'blind eyes see through the sky', 'tao legacy inheritance taoist', 'ugly duckling becomes a beauty',
  'abandoned by the gods become a god tep', 'summer in the countryside village farm', 'my girlfriend is a dragon neak',
  'senior disciple mountain peak', 'limitless special hands stretch', 'this love is only you sneh',
  'crazy female assassin killer', 'inescapable fate destiny', 'handsome guy everywhere pros saat'
]

const categoryOrder = Object.keys(genrePool) as Category[]

/** The catalog the server starts with on first run */
export function sampleCatalog(now = Date.UTC(2026, 10, 1)): Movie[] {
  return titles.map((title, i) => {
    const id = i + 1
    const category = categoryOrder[i % categoryOrder.length]!
    return normalizeMovie({
      id,
      title,
      description: 'រឿងភាគដ៏រំភើបដែលពោរពេញដោយស្នេហា ការផ្សងព្រេង និងការភ្ញាក់ផ្អើលក្នុងគ្រប់វគ្គ។',
      episode: '',
      episodes: ((i * 7) % 40) + 1,
      year: 2026,
      region: 'ចិន',
      genres: [...genrePool[category]],
      latin: latinTitles[i] ?? '',
      category,
      ...artworkFor(id),
      vip: i % 4 === 0,
      freeEpisodes: FREE_EPISODES,
      status: i % 3 === 2 ? 'completed' : 'ongoing',
      // The sample clips are 10 s long, so a 3 s "recap" keeps Skip recap testable
      recapSeconds: 3,
      // Later ids were "updated" more recently, matching the original order of Latest
      updatedAt: now - (titles.length - i) * 3_600_000
    })
  })
}

// ---------- Pure helpers over a catalog ----------

export const isLocked = (m: Movie, ep: number) => m.vip && ep > m.freeEpisodes

export const latestOf = (list: Movie[]) => [...list].sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id)
export const byCategoryOf = (list: Movie[], c: Category) => list.filter(m => m.category === c)
// Sample popularity orders until real view counts exist
export const rankNow = (list: Movie[]) => [...list].sort((a, b) => ((b.id * 37) % 23) - ((a.id * 37) % 23))
export const rankWeek = (list: Movie[]) => [...list].sort((a, b) => ((b.id * 13) % 19) - ((a.id * 13) % 19))

// Latin-keyboard aliases for categories and common words (many people type Khmer slowly on phones)
const latinAliases: { words: string[]; match: (m: Movie) => boolean }[] = [
  { words: ['kbach kun', 'kbachkun', 'martial', 'kung fu', 'kungfu', 'cultivation', 'wuxia', 'xianxia'], match: m => m.category === 'cultivation' },
  { words: ['sneha', 'sneh', 'love', 'romance', 'romantic'], match: m => m.category === 'romance' },
  { words: ['fantasy', 'srameu srame', 'magic', 'adventure'], match: m => m.category === 'fantasy' },
  { words: ['chen', 'chin', 'china', 'chinese'], match: m => m.region === 'ចិន' },
  { words: ['vip'], match: m => m.vip },
  { words: ['rueng', 'roeung', 'reung', 'ai', 'drama', 'series'], match: () => true }
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export function searchIn(list: Movie[], term: string) {
  const t = term.trim()
  if (!t) return []
  // Khmer (or any non-Latin) input: match titles and genres directly
  if (!/[a-z]/i.test(t)) {
    return list.filter(m => m.title.includes(t) || m.genres.some(g => g.includes(t)))
  }
  // Latin input: every word must match the title keywords or an alias
  const words = norm(t).split(' ').filter(w => w.length > 1)
  if (!words.length) return []
  const q = words.join(' ')
  return list.filter((m) => {
    const hay = norm(m.latin)
    if (hay.includes(q)) return true
    return words.every(w =>
      hay.split(' ').some(k => k.startsWith(w))
      || latinAliases.some(a => a.words.some(x => x.startsWith(w) || x === q) && a.match(m))
    )
  })
}

export type SortKey = 'latest' | 'popular' | 'liked' | 'episodes'
export type AccessKey = 'all' | 'free' | 'vip'
export type StatusKey = 'all' | 'ongoing' | 'completed'
export type LengthKey = 'all' | 'short' | 'long'

/** Series under this many episodes count as "short" in Browse */
export const SHORT_SERIES = 20

export interface LikeTotals {
  up: number
  down: number
}

/** Smoothed like ratio, so one 👍 doesn't outrank 50 👍 and 2 👎 */
export const likeScore = (t?: LikeTotals) => ((t?.up ?? 0) + 1) / ((t?.up ?? 0) + (t?.down ?? 0) + 2)

export function browseIn(
  list: Movie[],
  opts: { category?: Category | 'all'; access?: AccessKey; status?: StatusKey; length?: LengthKey; sort?: SortKey },
  likes: Record<number, LikeTotals> = {}
) {
  const base = opts.sort === 'popular'
    ? rankNow(list)
    : opts.sort === 'episodes'
      ? [...list].sort((a, b) => b.episodes - a.episodes)
      : opts.sort === 'liked'
        ? [...list].sort((a, b) => likeScore(likes[b.id]) - likeScore(likes[a.id]))
        : latestOf(list)
  return base.filter(m =>
    (!opts.category || opts.category === 'all' || m.category === opts.category)
    && (!opts.access || opts.access === 'all' || (opts.access === 'vip') === m.vip)
    && (!opts.status || opts.status === 'all' || m.status === opts.status)
    && (!opts.length || opts.length === 'all' || (opts.length === 'short') === (m.episodes < SHORT_SERIES))
  )
}

export interface EpisodeSource {
  src: string
  type: 'mp4' | 'hls'
  subtitles: string
}

/*
 * Sample streams for episodes without a published URL. The 10-second clips make auto-advance
 * quick to test; every 5th episode uses HLS.
 */
const sampleClips = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4'
]
const sampleHls = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export function episodeSource(m: Movie, ep: number): EpisodeSource {
  const published = m.sources?.[ep]
  const src = published ?? (ep % 5 === 0 ? sampleHls : sampleClips[(m.id + ep) % sampleClips.length]!)
  return {
    src,
    type: /\.m3u8(\?|$)/i.test(src) ? 'hls' : 'mp4',
    subtitles: `/subtitles/${m.id}/${ep}.vtt`
  }
}

/** Link-preview image (Open Graph's recommended 1200×630) for a series */
export const shareImage = (m: Movie) => `https://picsum.photos/seed/ruengflix-banner-${m.id}/1200/630`
