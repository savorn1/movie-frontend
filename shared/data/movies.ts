const khmerDigits = '០១២៣៤៥៦៧៨៩'
/** Khmer numerals for display text (episodes, counts, years). Prices and player time stay Western. */
export const toKhmerDigits = (n: number | string) => String(n).replace(/\d/g, d => khmerDigits[+d]!)

export interface Movie {
  id: number
  title: string
  description: string
  episode: string
  episodes: number
  year: number
  region: string
  genres: string[]
  /** English + romanised keywords so Latin-keyboard searches ("summer love", "sneha") match */
  latin: string
  category: 'cultivation' | 'romance' | 'fantasy'
  poster: string
  vertical: string
  banner: string
  vip: boolean
}

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

const genrePool = {
  cultivation: ['ក្បាច់គុន និងពិភពអមតៈ', 'សងសឹក និងជោគជ័យ', 'យុទ្ធភពបុរាណ'],
  romance: ['ស្នេហា និងមនោសញ្ចេតនា', 'ទីក្រុង និងមហាសេដ្ឋី', 'កើតជាថ្មី និងឆ្លងភព'],
  fantasy: ['រវើរវាយ', 'ដំណើរផ្សងព្រេង', 'អាថ៌កំបាំង']
} as const

const categories = Object.keys(genrePool) as Movie['category'][]

export const categoryLabels: Record<Movie['category'], string> = {
  cultivation: 'ក្បាច់គុន',
  romance: 'ស្នេហា',
  fantasy: 'ស្រមើស្រមៃ'
}

// Placeholder artwork from picsum, seeded per movie so images stay stable across reloads.
export const movies: Movie[] = titles.map((title, i) => {
  const category = categories[i % categories.length]!
  const episodes = ((i * 7) % 40) + 1
  return {
    id: i + 1,
    title,
    description: 'រឿងភាគដ៏រំភើបដែលពោរពេញដោយស្នេហា ការផ្សងព្រេង និងការភ្ញាក់ផ្អើលក្នុងគ្រប់វគ្គ។',
    episode: `វគ្គ ${toKhmerDigits(String(episodes).padStart(2, '0'))}`,
    episodes,
    year: 2026,
    region: 'ចិន',
    genres: [...genrePool[category]],
    latin: latinTitles[i] ?? '',
    category,
    poster: `https://picsum.photos/seed/ruengflix-${i + 1}/300/420`,
    vertical: `https://picsum.photos/seed/ruengflix-${i + 1}/540/960`,
    banner: `https://picsum.photos/seed/ruengflix-banner-${i + 1}/1600/700`,
    vip: i % 4 === 0
  }
})

export const featured = movies.slice(0, 8)
export const latest = [...movies].reverse()
export const byCategory = (c: Movie['category']) => movies.filter(m => m.category === c)
export const hotNow = [...movies].sort((a, b) => ((b.id * 37) % 23) - ((a.id * 37) % 23))
export const hotWeek = [...movies].sort((a, b) => ((b.id * 13) % 19) - ((a.id * 13) % 19))

// VIP series let everyone watch the first few episodes before asking for a plan.
export const FREE_EPISODES = 3

export const isLocked = (m: Movie, ep: number) => m.vip && ep > FREE_EPISODES

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

export function searchMovies(term: string) {
  const t = term.trim()
  if (!t) return []
  // Khmer (or any non-Latin) input: match titles and genres directly
  if (!/[a-z]/i.test(t)) {
    return movies.filter(m => m.title.includes(t) || m.genres.some(g => g.includes(t)))
  }
  // Latin input: every word must match the title keywords or an alias
  const words = norm(t).split(' ').filter(w => w.length > 1)
  if (!words.length) return []
  const q = words.join(' ')
  return movies.filter((m) => {
    const hay = norm(m.latin)
    if (hay.includes(q)) return true
    return words.every(w =>
      hay.split(' ').some(k => k.startsWith(w))
      || latinAliases.some(a => a.words.some(x => x.startsWith(w) || x === q) && a.match(m))
    )
  })
}


export type SortKey = 'latest' | 'popular' | 'episodes'
export type AccessKey = 'all' | 'free' | 'vip'

export function browseMovies(opts: { category?: Movie['category'] | 'all'; access?: AccessKey; sort?: SortKey }) {
  const base = opts.sort === 'popular' ? hotNow : opts.sort === 'episodes'
    ? [...movies].sort((a, b) => b.episodes - a.episodes)
    : latest
  return base.filter(m =>
    (!opts.category || opts.category === 'all' || m.category === opts.category)
    && (!opts.access || opts.access === 'all' || (opts.access === 'vip') === m.vip)
  )
}

// One-off price to unlock every VIP episode of a single series (vs. the monthly VIP plan)
export const SERIES_UNLOCK_PRICE = 0.49

export interface EpisodeSource {
  src: string
  type: 'mp4' | 'hls'
  subtitles: string
}

/*
 * Sample streams until real episode URLs exist. Swap this function for a lookup into your
 * own storage (HLS .m3u8 or MP4 per episode); everything else reads from it.
 * The 10-second clips make auto-advance quick to test; every 5th episode uses HLS.
 */
const sampleClips = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4'
]
const sampleHls = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export function episodeSource(movieId: number, ep: number): EpisodeSource {
  const hls = ep % 5 === 0
  return {
    src: hls ? sampleHls : sampleClips[(movieId + ep) % sampleClips.length]!,
    type: hls ? 'hls' : 'mp4',
    subtitles: `/subtitles/${movieId}/${ep}.vtt`
  }
}
