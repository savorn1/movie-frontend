interface InlineButton {
  text: string
  url: string
}

export class TelegramBlockedError extends Error {}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export { escapeHtml }

/** Send an HTML-formatted message, optionally with one row of link buttons. */
export async function tgSend(chatId: number, html: string, buttons: InlineButton[] = []) {
  const { telegramBotToken } = useRuntimeConfig()
  if (!telegramBotToken) throw createError({ statusCode: 503, message: 'Telegram bot token is not configured' })

  try {
    await $fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(buttons.length && { reply_markup: { inline_keyboard: [buttons] } })
      }
    })
  } catch (err: unknown) {
    // 403: the person blocked the bot or deleted the chat; callers drop them from the lists
    const status = (err as { statusCode?: number }).statusCode
    if (status === 403) throw new TelegramBlockedError(String(chatId))
    throw err
  }
}
