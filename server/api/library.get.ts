/** The signed-in viewer's synced library: { data, updatedAt } (data null before the first save) */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  return viewerApi<{ data: Record<string, unknown> | null; updatedAt: string | null }>('GET', `/${viewer.id}/library`)
})
