import type { Movie } from '#shared/data/movies'

/**
 * Follow or unfollow a series, with the best new-episode alert this viewer can get: Telegram on the
 * account (straight to their chat); this browser's notifications (Web Push, remote series, after our
 * short explanation and then the browser's prompt); or the Telegram bot by deep link (/start s<id>).
 * Following also shows the series' new episodes on the Me page. Used by the Follow button, the
 * schedule's "Notify me" and the nudge after episode 3.
 */
export function useFollowSeries() {
  const { isFollowing, toggleFollow } = useLibrary()
  const { viewer } = useViewer()
  const push = usePush()
  const { show, success } = useToast()
  const bot = useRuntimeConfig().public.telegramBot as string

  /** Signed in with Telegram on the account: alerts go straight to their chat */
  const accountAlerts = computed(() => !!viewer.value?.telegram)

  async function setAccountAlerts(id: number, on: boolean) {
    try {
      await $fetch(`/api/follows/${id}`, { method: on ? 'POST' : 'DELETE' })
      return true
    } catch {
      return false
    }
  }

  async function follow(movie: Movie) {
    const id = movie.id
    if (!isFollowing(id)) toggleFollow(id)
    haptic('tap')
    if (accountAlerts.value) {
      if (await setAccountAlerts(id, true)) success('បានតាមដាន · យើងនឹងផ្ញើដំណឹងវគ្គថ្មីទៅ Telegram របស់អ្នក')
      else show('បានតាមដាន · មិនអាចបើកដំណឹង Telegram បានទេពេលនេះ')
      return
    }
    if (movie.remote && push.supported()) {
      const ok = !push.needsAsking() || (await push.explain(`ទទួលដំណឹងពេល “${movie.title}” មានវគ្គថ្មី?`))
      if (ok && (await push.setFollow(id, true))) {
        success('បានតាមដាន · យើងនឹងជូនដំណឹងនៅលើឧបករណ៍នេះពេលមានវគ្គថ្មី')
        return
      }
    }
    if (bot) {
      window.open(`https://t.me/${bot}?start=s${id}`, '_blank', 'noopener')
      show('បើក Telegram ហើយចុច Start ដើម្បីទទួលដំណឹងវគ្គថ្មី')
    } else {
      success('បានតាមដាន។ យើងនឹងបង្ហាញវគ្គថ្មីនៅក្នុង “ខ្ញុំ”។')
    }
  }

  async function unfollow(movie: Movie) {
    const id = movie.id
    if (isFollowing(id)) toggleFollow(id)
    haptic('tap')
    if (accountAlerts.value) await setAccountAlerts(id, false)
    if (movie.remote && push.supported()) push.setFollow(id, false)
    const message = accountAlerts.value
      ? 'បានឈប់តាមដាន និងឈប់ផ្ញើដំណឹង Telegram'
      : bot
        ? 'បានឈប់តាមដាន។ ផ្ញើ /stop ទៅ bot ដើម្បីឈប់ទទួលសារ Telegram។'
        : 'បានឈប់តាមដាន'
    // Undo puts back what was there, without opening Telegram or asking again
    show(message, {
      label: 'មិនធ្វើវិញ',
      run: () => {
        if (!isFollowing(id)) toggleFollow(id)
        if (accountAlerts.value) setAccountAlerts(id, true)
        else if (movie.remote && push.supported() && Notification.permission === 'granted') push.setFollow(id, true)
      }
    })
  }

  const toggle = (movie: Movie) => (isFollowing(movie.id) ? unfollow(movie) : follow(movie))

  return { isFollowing, follow, unfollow, toggle, botName: bot }
}
