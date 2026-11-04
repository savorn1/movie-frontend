/*
 * Delete the signed-in viewer's account for good: { confirm: "DELETE" }. Their library, coins, unlocks,
 * comments and Telegram alerts go; payments stay in the accounts without their name.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'delete-account', 3, 60 * 60_000)
  const body = await readBody<{ confirm?: unknown }>(event)
  if (body?.confirm !== 'DELETE') throw createError({ statusCode: 400, message: 'Expected { confirm: "DELETE" }' })
  await viewerApi('DELETE', `/${viewer.id}`)
  await (await viewerSession(event)).clear()
  return { deleted: true }
})
