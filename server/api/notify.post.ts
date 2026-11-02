import { movies } from '#shared/data/movies'

/*
 * Tell every follower of a series that a new episode is out. Call it from your upload flow:
 *   curl -X POST <SITE>/api/notify -H "Authorization: Bearer <NUXT_NOTIFY_SECRET>" \
 *        -H "Content-Type: application/json" -d '{"seriesId": 12, "ep": 9}'
 */
export default defineEventHandler(async (event) => {
  const { notifySecret, public: pub } = useRuntimeConfig(event)
  if (!notifySecret || getHeader(event, 'authorization') !== `Bearer ${notifySecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<{ seriesId?: number; ep?: number }>(event)
  const movie = movies.find(m => m.id === Number(body?.seriesId))
  const ep = Number(body?.ep)
  if (!movie || !Number.isInteger(ep) || ep < 1) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, ep } for an existing series' })
  }

  const site = pub.siteUrl.replace(/\/$/, '')
  const chats = await followersOf(movie.id)
  let sent = 0
  let removed = 0
  let failed = 0

  for (const chatId of chats) {
    try {
      await tgSend(
        chatId,
        `🔔 វគ្គថ្មី! <b>${escapeHtml(movie.title)}</b> វគ្គ ${ep} ចេញហើយ។`,
        [{ text: `▶️ មើលវគ្គ ${ep}`, url: `${site}/watch/${movie.id}/${ep}` }]
      )
      sent++
    } catch (err) {
      if (err instanceof TelegramBlockedError) {
        await removeChat(chatId)
        removed++
      } else {
        failed++
      }
    }
    // Stay well under Telegram's ~30 messages/second limit
    await new Promise(r => setTimeout(r, 50))
  }

  return { followers: chats.length, sent, removed, failed }
})
