import { movies } from '#shared/data/movies'

interface TgUpdate {
  message?: {
    chat: { id: number }
    text?: string
  }
}

/*
 * Telegram webhook. Register it once with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram/webhook&secret_token=<SECRET>
 *
 * /start s<id>  follow series <id> (sent by the site's Follow button deep link)
 * /stop         stop all alerts for this chat
 * /list         show what this chat follows
 */
export default defineEventHandler(async (event) => {
  const { telegramWebhookSecret, public: pub } = useRuntimeConfig(event)
  if (!telegramWebhookSecret || getHeader(event, 'x-telegram-bot-api-secret-token') !== telegramWebhookSecret) {
    throw createError({ statusCode: 401, message: 'Bad webhook secret' })
  }

  const update = await readBody<TgUpdate>(event)
  const chatId = update.message?.chat.id
  const text = update.message?.text?.trim() ?? ''
  if (!chatId || !text.startsWith('/')) return { ok: true }

  const [command, arg] = text.split(/\s+/, 2)
  const site = pub.siteUrl.replace(/\/$/, '')

  if (command === '/start' && arg?.startsWith('s')) {
    const movie = movies.find(m => m.id === Number(arg.slice(1)))
    if (!movie) {
      await tgSend(chatId, 'រកមិនឃើញរឿងនេះទេ។')
      return { ok: true }
    }
    await addFollow(movie.id, chatId)
    await tgSend(
      chatId,
      `✅ អ្នកកំពុងតាមដាន <b>${escapeHtml(movie.title)}</b>។\nយើងនឹងផ្ញើសារមកពេលមានវគ្គថ្មី។\n\nផ្ញើ /stop ដើម្បីឈប់ទទួលដំណឹង។`,
      [{ text: '▶️ មើលឥឡូវ', url: `${site}/detail/${movie.id}` }]
    )
  } else if (command === '/stop') {
    const series = await removeChat(chatId)
    await tgSend(chatId, series.length ? 'បានឈប់ទទួលដំណឹងទាំងអស់ហើយ។' : 'អ្នកមិនទាន់តាមដានរឿងណាមួយទេ។')
  } else if (command === '/list') {
    const titles = (await followedBy(chatId))
      .map(id => movies.find(m => m.id === id)?.title)
      .filter(Boolean)
      .map(t => `• ${escapeHtml(t!)}`)
    await tgSend(chatId, titles.length ? `រឿងដែលអ្នកតាមដាន៖\n${titles.join('\n')}` : 'អ្នកមិនទាន់តាមដានរឿងណាមួយទេ។')
  } else {
    await tgSend(
      chatId,
      'សួស្តី! ចុច “តាមដាន” នៅលើរឿងណាមួយក្នុងគេហទំព័រ ដើម្បីទទួលដំណឹងពេលមានវគ្គថ្មី។',
      [{ text: 'បើក RuengFlix', url: site }]
    )
  }
  return { ok: true }
})
