/** Running promotions for the banner: a VIP series free for a while, extra coins on packs */
export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) return []
  setHeader(event, 'Cache-Control', 'public, max-age=30')
  return codedApi('GET', '/promotions').catch(() => [])
})
