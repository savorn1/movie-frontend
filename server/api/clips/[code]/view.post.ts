/** Count a view of a shared clip (once per page load) */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'clip-view', 60, 60_000)
  const code = String(getRouterParam(event, 'code') ?? '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16)
  if (code.length >= 6) await codedApi('POST', `/clips/${code}/view`).catch(() => {})
  setResponseStatus(event, 204)
  return null
})
