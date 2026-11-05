import { toKhmerDigits } from '#shared/data/movies'
/*
 * "You stopped at episode N": one message 24–72 hours after a viewer's last finished episode of a
 * series, when the next one is out and they haven't watched it. Sent to their Telegram and browsers
 * with notifications on, with a link straight to that episode. movie-api picks who is due; each one is
 * marked sent before sending, so two RuengFlix servers never send the same reminder.
 */
interface Due {
  viewerId: number
  displayName: string
  telegramId: number | null
  seriesId: number
  title: string
  episode: number
  push: PushTarget[]
}

export async function sendResumeReminders() {
  if (!movieApiEnabled()) return { reminded: 0 }
  const due = await apiCall<Due[]>('GET', '/resume-reminders?limit=200')
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const hasBot = !!useRuntimeConfig().telegramBotToken
  let reminded = 0
  for (const r of due) {
    const mark = await apiCall<{ sent: boolean }>('POST', '/resume-reminders/sent', {
      viewerId: r.viewerId,
      seriesId: r.seriesId,
      episode: r.episode
    }).catch(() => ({ sent: false }))
    if (!mark.sent) continue
    const url = `${site}/watch/${r.seriesId}/${r.episode}`
    const text = `អ្នកឈប់មើល “${r.title}” នៅវគ្គ ${toKhmerDigits(r.episode - 1)}។ វគ្គ ${toKhmerDigits(r.episode)} កំពុងរង់ចាំអ្នក!`
    if (r.telegramId && hasBot) {
      await tgSend(r.telegramId, `▶️ <b>${escapeHtml(r.title)}</b>\n${escapeHtml(text)}`, [
        { text: `មើលវគ្គ ${toKhmerDigits(r.episode)}`, url }
      ]).catch(err => console.warn(`[resume-reminders] Telegram ${r.viewerId}:`, (err as Error).message))
    }
    await pushTo(r.push, { title: r.title, body: text, url, tag: `resume-${r.seriesId}` }).catch(() => 0)
    reminded++
  }
  if (reminded) console.info(`[resume-reminders] reminded ${reminded} viewer(s)`)
  return { reminded }
}
