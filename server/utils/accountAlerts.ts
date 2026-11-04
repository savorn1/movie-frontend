import type { H3Event } from 'h3'

/**
 * The signed-in viewer's Telegram chat (their Telegram user id), for following series from the site
 * without the bot's deep link. 409 NO_TELEGRAM when the account has no Telegram.
 */
export async function requireTelegramChat(event: H3Event): Promise<number> {
  const viewer = await requireViewer(event)
  if (viewer.telegramId == null) {
    throw createError({ statusCode: 409, message: 'Add Telegram to the account first', data: { code: 'NO_TELEGRAM' } })
  }
  return viewer.telegramId
}

export function seriesIdParam(event: H3Event) {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, message: 'Bad series id' })
  return id
}
