import { DEFAULT_PRICES } from '#shared/data/movies'

/** Site-wide settings for pages: prices and home rows set in videolingo-web (via movie-api), else the defaults */
export default defineEventHandler(async () => {
  if (!movieApiEnabled()) return { prices: DEFAULT_PRICES, homeRows: [] }
  try {
    return await apiSite()
  } catch {
    // movie-api unreachable with nothing cached: keep selling at the default prices
    return { prices: DEFAULT_PRICES, homeRows: [] }
  }
})
