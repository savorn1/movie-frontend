/** Save the signed-in viewer's library: { data } */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'viewer-library', 60, 60_000)
  const body = await readBody<{ data?: unknown }>(event)
  if (!body?.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    throw createError({ statusCode: 400, message: 'Expected { data: {…} }' })
  }
  return viewerApi<{ updatedAt: string }>('PUT', `/${viewer.id}/library`, { data: body.data })
})
