import { normalizeMovie, sampleCatalog, type Movie } from '#shared/data/movies'

// The live catalog, edited from /admin. Seeded with the sample content on first run.
const store = () => useStorage('catalog')
const KEY = 'series'

export async function getCatalog(): Promise<Movie[]> {
  const list = await store().getItem<Movie[]>(KEY)
  if (list?.length) return list
  const seed = sampleCatalog()
  await store().setItem(KEY, seed)
  return seed
}

export async function saveCatalog(list: Movie[]) {
  await store().setItem(KEY, list.map(normalizeMovie))
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
