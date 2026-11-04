/** Stop Telegram alerts for one series */
export default defineEventHandler(async (event) => {
  const chatId = await requireTelegramChat(event)
  rateLimit(event, 'viewer-follow', 60, 60_000)
  await removeFollow(seriesIdParam(event), chatId)
  return { following: false }
})
