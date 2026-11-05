/*
 * "Your VIP ends in N days": once per VIP end date, three days before, to the viewer's Telegram (when
 * the account has it) and to their browsers with notifications on. movie-api hands each viewer to one
 * caller only, so several RuengFlix servers never send the same reminder twice. The site also shows a
 * banner (VipReminder.vue) from the wallet, so viewers without either still see it.
 */
interface Due {
  viewerId: number
  displayName: string
  vipUntil: string
  telegramId: number | null
  push: PushTarget[]
}

const daysLeft = (iso: string) => Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000))

export async function sendVipReminders() {
  if (!movieApiEnabled()) return { reminded: 0 }
  const due = await apiCall<Due[]>('POST', '/vip-reminders/claim')
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const hasBot = !!useRuntimeConfig().telegramBotToken
  for (const v of due) {
    const days = daysLeft(v.vipUntil)
    const date = new Date(v.vipUntil).toLocaleDateString('en-GB', { timeZone: 'Asia/Phnom_Penh' })
    const text = `VIP របស់អ្នកនឹងផុតក្នុងរយៈពេល ${days} ថ្ងៃទៀត (${date})។ បន្តឥឡូវ ដើម្បីមើលរឿង VIP ដោយគ្មានការរំខាន។`
    if (v.telegramId && hasBot) {
      await tgSend(v.telegramId, `👑 <b>${escapeHtml(v.displayName)}</b>\n${escapeHtml(text)}`, [{ text: 'បន្ត VIP', url: `${site}/vip` }]).catch(err =>
        console.warn(`[vip-reminders] Telegram ${v.viewerId}:`, (err as Error).message)
      )
    }
    await pushTo(v.push, { title: 'VIP ជិតផុតហើយ', body: text, url: `${site}/vip`, tag: 'vip-ending' }).catch(() => 0)
  }
  if (due.length) console.info(`[vip-reminders] reminded ${due.length} viewer(s)`)
  return { reminded: due.length }
}
