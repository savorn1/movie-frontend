/*
 * RuengFlix as a Telegram Mini App (opened from the bot's menu button or a t.me/<bot>/<app> link).
 * Telegram puts `tgWebAppData` in the address on launch; then this:
 *   - loads Telegram's script and tells it the app is ready, full height;
 *   - signs the viewer in with the data Telegram signed (no password, no widget);
 *   - opens what the link asked for: startapp=series_12, ep_12_5, gift_CODE or clip_CODE;
 *   - drives Telegram's own Back button, and matches its header colour to the site's theme.
 * Outside Telegram it does nothing (the script isn't even loaded).
 */
interface TelegramWebApp {
  initData: string
  initDataUnsafe: { start_param?: string }
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void }
}

const SESSION_KEY = 'rf-tg-mini-app'

function loadScript(): Promise<TelegramWebApp | null> {
  const existing = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  if (existing) return Promise.resolve(existing)
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://telegram.org/js/telegram-web-app.js'
    s.async = true
    s.onload = () => resolve((window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
}

/** Where a Mini App start parameter leads (letters, digits, _ and - only, as Telegram allows) */
export function startPath(param: string | null | undefined): string | null {
  if (!param) return null
  let m = /^series_(\d{1,9})$/.exec(param)
  if (m) return `/detail/${m[1]}`
  m = /^ep_(\d{1,9})_(\d{1,5})$/.exec(param)
  if (m) return `/watch/${m[1]}/${m[2]}`
  m = /^gift_([0-9A-Za-z]{6,16})$/.exec(param)
  if (m) return `/gift/${m[1]}`
  m = /^clip_([0-9A-Za-z]{6,16})$/.exec(param)
  if (m) return `/clip/${m[1]}`
  return null
}

/** The launch hash as Telegram sent it (saved by an inline <head> script before the router rewrote it) */
function launchHash(): string {
  try {
    return sessionStorage.getItem('rf-tg-hash') ?? (window.location.hash.includes('tgWebAppData') ? window.location.hash : '')
  } catch {
    return window.location.hash.includes('tgWebAppData') ? window.location.hash : ''
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const hash = launchHash()
  let launched = !!hash
  try {
    launched ||= sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    // Storage blocked: only a fresh launch (with its hash) counts
  }
  if (!launched) return
  // Signed by Telegram: what the server checks to sign the viewer in
  const launchData = hash ? new URLSearchParams(hash.slice(1)).get('tgWebAppData') : null
  const flag = useState('telegram-mini-app', () => false)
  flag.value = true
  document.documentElement.classList.add('in-telegram')
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Private mode: the next full reload inside Telegram finds tgWebAppData again anyway
  }

  nuxtApp.hook('app:mounted', async () => {
    // Telegram's script reads the launch data from the hash too: give it back the original
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + hash)
    }
    const tg = await loadScript()
    if (!tg) return
    tg.ready()
    tg.expand()
    // Telegram's header and background in the site's own colour ("rgb(r, g, b)" → "#rrggbb")
    const paint = () => {
      const rgb = getComputedStyle(document.body).backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
      const hex = '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('')
      tg.setHeaderColor?.(hex)
      tg.setBackgroundColor?.(hex)
    }
    paint()

    const router = useRouter()
    const back = () => (window.history.length > 1 ? router.back() : navigateTo('/'))
    tg.BackButton.onClick(back)
    const syncBack = (path: string) => (path === '/' ? tg.BackButton.hide() : tg.BackButton.show())
    syncBack(router.currentRoute.value.path)
    router.afterEach(to => syncBack(to.path))

    // Signed in with the Telegram account that opened the app
    const { viewer, refreshViewer } = useViewer()
    let startParam = tg.initDataUnsafe?.start_param ?? null
    const initData = launchData || tg.initData
    if (initData && !viewer.value) {
      try {
        const r = await $fetch<{ startParam: string | null }>('/api/auth/telegram-webapp', {
          method: 'POST',
          body: { initData }
        })
        startParam = r.startParam ?? startParam
        await refreshViewer()
      } catch {
        // Sign-in can still be done by hand from the Me page
      }
    }
    const to = startPath(startParam)
    try {
      if (to && sessionStorage.getItem('rf-tg-started') !== startParam) {
        sessionStorage.setItem('rf-tg-started', startParam!)
        await navigateTo(to)
      }
    } catch {
      if (to) await navigateTo(to)
    }
  })
})
