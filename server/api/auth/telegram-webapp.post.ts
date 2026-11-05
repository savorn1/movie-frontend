/*
 * Sign-in inside Telegram (RuengFlix opened as a Mini App from the bot): the page posts the signed
 * `initData` Telegram gave it.   POST { initData }
 * Signs in (creating the account on first use) without a password or widget; the Mini App start
 * parameter (series_12, gift_CODE, clip_CODE) comes back so the page can open the right place.
 */
export default defineEventHandler(async (event) => {
  requireAccounts(event)
  rateLimit(event, 'viewer-telegram', 20, 15 * 60_000)
  if (!getHeader(event, 'content-type')?.startsWith('application/json')) {
    throw createError({ statusCode: 415, message: 'Send JSON' })
  }
  const { telegramBotToken } = useRuntimeConfig(event)
  if (!telegramBotToken) {
    throw createError({ statusCode: 503, message: 'Telegram sign-in is not set up', data: { code: 'UNAVAILABLE' } })
  }
  const body = await readBody<{ initData?: unknown }>(event)
  const user = typeof body?.initData === 'string' ? verifyTelegramWebApp(body.initData, telegramBotToken) : null
  if (!user) throw createError({ statusCode: 401, message: 'Telegram sign-in could not be checked', data: { code: 'TELEGRAM_INVALID' } })

  const viewer = await viewerIdentity({
    provider: 'telegram',
    subject: user.id,
    displayName: user.name,
    username: user.username,
    photoUrl: user.photoUrl
  })
  await signIn(event, viewer, true)
  return { viewer: clientViewer(viewer), startParam: user.startParam }
})
