/** Checks for VIP ending soon every hour (and a minute after start), while the server runs */
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  const run = () => sendVipReminders().catch(err => console.warn('[vip-reminders]', (err as Error).message))
  const first = setTimeout(run, 60_000)
  const hourly = setInterval(run, 60 * 60_000)
  first.unref?.()
  hourly.unref?.()
})
