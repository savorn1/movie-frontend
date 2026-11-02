// Built-in browsers of chat/social apps, where full screen, autoplay and downloads are often limited.
// iOS Telegram opens links in Safari's own view, so it needs no special handling.
const APPS: [RegExp, string][] = [
  [/FBAN|FBAV|FB_IAB|FB4A|Messenger/i, 'Facebook'],
  [/Instagram/i, 'Instagram'],
  [/Telegram/i, 'Telegram'],
  [/\bLine\//i, 'LINE'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/; wv\)/i, 'កម្មវិធី'] // generic Android WebView
]

export function useInAppBrowser() {
  const info = useState<{ app: string | null; android: boolean; ios: boolean }>('in-app', () => ({
    app: null,
    android: false,
    ios: false
  }))

  /** Read the user agent once on the client */
  function detect() {
    const ua = navigator.userAgent
    info.value = {
      app: APPS.find(([re]) => re.test(ua))?.[1] ?? null,
      android: /Android/i.test(ua),
      ios: /iPhone|iPad|iPod/i.test(ua)
    }
  }

  /** Android: an intent link that opens this page in Chrome, falling back to the plain URL */
  const chromeIntent = () => {
    const { host, pathname, search, href } = window.location
    return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;`
      + `S.browser_fallback_url=${encodeURIComponent(href)};end`
  }

  return { info, detect, chromeIntent }
}
