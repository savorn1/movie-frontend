/** "You stopped at episode N" reminders: checked every hour (and two minutes after start) */
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  const run = () => sendResumeReminders().catch(err => console.warn('[resume-reminders]', (err as Error).message))
  const first = setTimeout(run, 120_000)
  const hourly = setInterval(run, 60 * 60_000)
  first.unref?.()
  hourly.unref?.()
})
