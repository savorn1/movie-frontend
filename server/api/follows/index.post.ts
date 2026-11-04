/*
 * Turn on Telegram alerts for every series the viewer already follows on the site: { seriesIds }.
 * Sent once after signing in, so follows made before Telegram was on the account get alerts too.
 * Series no longer on the site are skipped.
 */
export default defineEventHandler(async (event) => {
  const chatId = await requireTelegramChat(event)
  rateLimit(event, 'viewer-follow-all', 10, 60_000)
  const body = await readBody<{ seriesIds?: unknown }>(event)
  const ids = Array.isArray(body?.seriesIds)
    ? [...new Set(body.seriesIds.filter((id): id is number => Number.isInteger(id) && id > 0))].slice(0, 200)
    : []
  let added = 0
  for (const id of ids) {
    try {
      await addFollow(id, chatId)
      added++
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode !== 404) throw err
    }
  }
  return { added }
})
