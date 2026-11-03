const SENT_KEY = 'ruengflix-insights-sent'

/**
 * Anonymous viewing events for the admin insights: "start" when an episode first plays on this
 * device, "complete" at 90%. Each is sent at most once per device and episode, so the totals
 * approximate unique viewers. Sent with sendBeacon so it survives closing the tab.
 */
export function useInsights() {
  function alreadySent(key: string) {
    try {
      const sent: string[] = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]')
      if (sent.includes(key)) return true
      localStorage.setItem(SENT_KEY, JSON.stringify([...sent, key].slice(-2000)))
    } catch {}
    return false
  }

  function track(seriesId: number, ep: number, kind: 'start' | 'complete') {
    if (alreadySent(`${seriesId}:${ep}:${kind}`)) return
    const body = JSON.stringify({ seriesId, ep, kind })
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/insights', blob)) {
      fetch('/api/insights', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  }

  return { track }
}
