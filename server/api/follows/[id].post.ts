/** Telegram alerts for one series, sent to the signed-in viewer's own Telegram */
export default defineEventHandler(async (event) => {
  const chatId = await requireTelegramChat(event)
  rateLimit(event, 'viewer-follow', 60, 60_000)
  await addFollow(seriesIdParam(event), chatId)
  return { following: true }
})
