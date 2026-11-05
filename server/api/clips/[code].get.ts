/** A shared clip: its video once cut (status READY), and the series it's from */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'clip-look', 120, 60_000)
  const code = String(getRouterParam(event, 'code') ?? '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16)
  if (code.length < 6) throw createError({ statusCode: 404, message: 'Clip not found' })
  const clip = await codedApi<{ status: string }>('GET', `/clips/${code}`)
  setHeader(event, 'Cache-Control', clip.status === 'READY' ? 'public, max-age=300' : 'no-store')
  return clip
})
