import { artworkFor, FREE_EPISODES, normalizeMovie, type Movie } from '#shared/data/movies'

/** Create a series (starts with 1 episode; publish more from the dashboard) */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const input = parseSeriesInput({
    description: '', latin: '', region: 'ចិន', year: new Date().getFullYear(),
    freeEpisodes: FREE_EPISODES, recapSeconds: 0, status: 'ongoing', vip: false,
    ...body
  }, false)
  const videoUrl = parseVideoUrl(body.videoUrl)

  const list = await getCatalog()
  const id = Math.max(0, ...list.map(m => m.id)) + 1
  const movie = normalizeMovie({
    ...(input as Required<typeof input>),
    id,
    episode: '',
    episodes: 1,
    ...artworkFor(id),
    sources: videoUrl ? { 1: videoUrl } : undefined,
    updatedAt: Date.now()
  } satisfies Movie)
  await saveCatalog([...list, movie])
  setResponseStatus(event, 201)
  return movie
})
