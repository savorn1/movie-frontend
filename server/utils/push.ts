import webpush from 'web-push'
import type { Movie } from '#shared/data/movies'

/*
 * Browser notifications (Web Push) for new episodes, for viewers who don't use Telegram. Needs a VAPID
 * key pair (npx web-push generate-vapid-keys): NUXT_PUBLIC_VAPID_PUBLIC_KEY, NUXT_VAPID_PRIVATE_KEY,
 * and NUXT_VAPID_SUBJECT (mailto: or https: contact). Subscriptions are kept by movie-api.
 */
export function pushEnabled() {
  const c = useRuntimeConfig()
  return movieApiEnabled() && !!c.public.vapidPublicKey && !!c.vapidPrivateKey
}

/** Push "episode N is out" to every browser following the series; drops subscriptions that are gone */
export async function pushNewEpisode(movie: Movie, ep: number) {
  if (!pushEnabled()) return { sent: 0, removed: 0, failed: 0 }
  const c = useRuntimeConfig()
  const site = c.public.siteUrl.replace(/\/$/, '')
  const targets = await apiCall<{ id: number; endpoint: string; p256dh: string; auth: string }[]>('GET', `/series/${movie.id}/push`)
  const payload = JSON.stringify({
    title: `វគ្គថ្មី · ${movie.title}`,
    body: `វគ្គ ${ep} ចេញហើយ។ ចុចដើម្បីមើល។`,
    url: `${site}/watch/${movie.id}/${ep}`,
    icon: '/icons/icon-192.png',
    tag: `series-${movie.id}`
  })
  let sent = 0
  let removed = 0
  let failed = 0
  for (const t of targets) {
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, {
        vapidDetails: { subject: c.vapidSubject || site, publicKey: c.public.vapidPublicKey, privateKey: c.vapidPrivateKey },
        TTL: 24 * 3600,
        timeout: 8000
      })
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // The browser unsubscribed or the subscription expired
      if (status === 404 || status === 410) {
        await apiCall('DELETE', `/push/subscriptions/${t.id}`).catch(() => {})
        removed++
      } else {
        failed++
      }
    }
  }
  return { sent, removed, failed }
}
