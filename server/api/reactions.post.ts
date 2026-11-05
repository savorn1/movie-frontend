/** React to a moment of an episode: { series, ep, second, kind } (anyone; rate-limited per visitor) */
const KINDS = ['laugh', 'cry', 'fire', 'love']

export default defineEventHandler(async (event) => {
  if (!movieApiEnabled()) throw createError({ statusCode: 404, message: 'No remote catalog configured' })
  rateLimit(event, 'reaction', 30, 60_000)
  const body = await readBody<{ series?: unknown; ep?: unknown; second?: unknown; kind?: unknown }>(event)
  const series = Number(body?.series)
  const ep = Number(body?.ep)
  const second = Number(body?.second)
  if (!Number.isInteger(series) || !Number.isInteger(ep) || !Number.isFinite(second) || second < 0 || !KINDS.includes(String(body?.kind))) {
    throw createError({ statusCode: 400, message: 'series, ep, second and kind are required' })
  }
  return apiCall('POST', `/series/${series}/episodes/${ep}/reactions`, { second, kind: body!.kind })
})
