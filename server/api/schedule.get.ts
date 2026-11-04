/** Episodes coming out in the next 7 days, soonest first (empty for the sample series) */
export default defineEventHandler(async () => {
  if (!movieApiEnabled()) return []
  return (await apiCached<unknown[]>('/schedule?days=7')) ?? []
})
