/** ?series=1,2,3: series watched by people who watched those, best first ([] without movie-api) */
export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) return []
  const ids = String(getQuery(event).series ?? '')
    .split(',')
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0)
    .slice(0, 10)
    .sort((a, b) => a - b)
  if (!ids.length) return []
  return (await apiCached<{ seriesId: number; viewers: number }[]>(`/recommendations?series=${ids.join(',')}&limit=12`)) ?? []
})
