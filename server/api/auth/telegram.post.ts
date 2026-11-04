/*
 * "Continue with Telegram": the Telegram Login Widget's signed data, posted as JSON by the page.
 *   POST { data: { id, first_name, …, auth_date, hash }, link?: true }
 * Signs in (creating the account on first use), or with `link` adds Telegram to the signed-in account.
 * JSON only: a form posted from another site can't sign someone into an account that isn't theirs.
 */
export default defineEventHandler(async (event) => {
  requireAccounts(event)
  rateLimit(event, 'viewer-telegram', 20, 15 * 60_000)
  if (!getHeader(event, 'content-type')?.startsWith('application/json')) {
    throw createError({ statusCode: 415, message: 'Send JSON' })
  }
  const { telegramBotToken } = useRuntimeConfig(event)
  if (!signInMethods(event).telegram) {
    throw createError({ statusCode: 503, message: 'Telegram sign-in is not set up', data: { code: 'UNAVAILABLE' } })
  }
  const body = await readBody<{ data?: Record<string, unknown>; link?: boolean }>(event)
  const user = body?.data && typeof body.data === 'object' ? verifyTelegramLogin(body.data, telegramBotToken) : null
  if (!user) throw createError({ statusCode: 401, message: 'Telegram sign-in could not be checked', data: { code: 'TELEGRAM_INVALID' } })

  const linkTo = body?.link ? (await requireViewer(event)).id : undefined
  const viewer = await viewerIdentity({
    provider: 'telegram',
    subject: user.id,
    displayName: user.name,
    username: user.username,
    photoUrl: user.photoUrl,
    linkTo
  })
  await signIn(event, viewer, true)
  return { viewer: clientViewer(viewer) }
})
