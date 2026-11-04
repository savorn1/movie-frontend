/*
 * New-episode notifications in this browser (Web Push), for viewers without Telegram on their account.
 * Works where the service worker runs (production builds) and the server has a VAPID key; on iPhone,
 * only once RuengFlix is added to the Home Screen (Apple's rule).
 */
export function usePush() {
  const key = useRuntimeConfig().public.vapidPublicKey as string
  const following = useState<number[] | null>('push-following', () => null)

  const supported = () =>
    import.meta.client && !!key && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  /** This browser's subscription, created when `ask` (shows the permission prompt) */
  async function subscription(ask: boolean): Promise<PushSubscription | null> {
    if (!supported()) return null
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing
    if (!ask) return null
    if ((await Notification.requestPermission()) !== 'granted') return null
    return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
  }

  /** Turn this browser's notifications for a series on or off; false when the browser can't or won't */
  async function setFollow(seriesId: number, follow: boolean): Promise<boolean> {
    try {
      const sub = await subscription(follow)
      if (!sub) return false
      const saved = await $fetch<{ following: number[] }>('/api/push/subscription', { method: 'PUT', body: { subscription: sub.toJSON() } })
      await $fetch('/api/push/follow', { method: 'POST', body: { endpoint: sub.endpoint, seriesId, follow } })
      following.value = follow
        ? [...new Set([...saved.following, seriesId])]
        : saved.following.filter(id => id !== seriesId)
      return true
    } catch {
      return false
    }
  }

  return { supported, setFollow, following }
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}
