import {
  browseIn, byCategoryOf, latestOf, rankNow, rankWeek, searchIn,
  type Category, type LikeTotals, type Movie
} from '#shared/data/movies'

/**
 * The live catalog (owned by the server, edited from /admin). The catalog plugin loads it once
 * per visit, during server rendering, so it arrives with the page.
 */
export function useCatalog() {
  const movies = useState<Movie[]>('catalog', () => [])

  const find = (id: number) => movies.value.find(m => m.id === id)
  const latest = computed(() => latestOf(movies.value))
  const hotNow = computed(() => rankNow(movies.value))
  const hotWeek = computed(() => rankWeek(movies.value))
  const featured = computed(() => movies.value.slice(0, 8))
  const byCategory = (c: Category) => byCategoryOf(movies.value, c)
  const search = (term: string) => searchIn(movies.value, term)
  const browse = (opts: Parameters<typeof browseIn>[1], likes?: Record<number, LikeTotals>) => browseIn(movies.value, opts, likes)

  async function refresh() {
    movies.value = await $fetch<Movie[]>('/api/catalog')
  }

  return { movies, find, latest, hotNow, hotWeek, featured, byCategory, search, browse, refresh }
}
