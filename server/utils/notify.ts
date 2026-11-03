import type { Movie } from '#shared/data/movies'

/** Message every Telegram follower of a series about a new episode; drops people who blocked the bot */
export async function notifyNewEpisode(movie: Movie, ep: number) {
  const { public: pub } = useRuntimeConfig()
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
}
