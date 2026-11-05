/** The most searched terms this week, for the empty search box */
export default defineEventHandler(async () => {
  if (!movieApiEnabled()) return []
  try {
    return await apiCached<{ term: string; count: number }[]>('/search/trending?limit=8')
  } catch {
    return []
  }
})
