/*
 * Plays a video through this server (see utils/mediaGuard): checks the token, this browser's device
 * cookie, the signed-in viewer for paid episodes, and that the video player itself is asking (not a new
 * tab or "Save as"). Then fetches the bytes from storage with the player's Range and streams them on.
 * The storage address never reaches the browser. Previews only serve the opening part of the file.
 */
interface Upstream {
  url: string
  durationSeconds: number | null
  previewSeconds: number | null
  size?: number
  at: number
}

// Storage links per viewer/episode, reused for a few minutes (they're signed for hours by movie-api)
const upstreams = new Map<string, Upstream>()
const UPSTREAM_MS = 5 * 60_000

async function upstreamFor(seriesId: number, ep: number, kind: 'full' | 'preview', viewerId?: number): Promise<Upstream | null> {
  const cacheKey = `${viewerId ?? 'anon'}:${seriesId}:${ep}:${kind}`
  const hit = upstreams.get(cacheKey)
  if (hit && Date.now() - hit.at < UPSTREAM_MS) return hit
  const episode = (await apiEpisodes(seriesId, viewerId))?.find(e => e.number === ep)
  const url = kind === 'full' ? episode?.videoUrl : episode?.preview?.url
  if (!episode || !url) return null
  const up: Upstream = { url, durationSeconds: episode.durationSeconds, previewSeconds: episode.preview?.seconds ?? null, at: Date.now() }
  if (upstreams.size > 5000) upstreams.clear()
  upstreams.set(cacheKey, up)
  return up
}

/** The file's size (for a preview's byte limit), from a one-byte request */
async function sizeOf(up: Upstream): Promise<number | null> {
  if (up.size) return up.size
  const r = await fetch(up.url, { headers: { Range: 'bytes=0-0' } }).catch(() => null)
  const total = Number(r?.headers.get('content-range')?.split('/')[1])
  await r?.body?.cancel().catch(() => {})
  if (Number.isFinite(total) && total > 0) up.size = total
  return up.size ?? null
}

const refuse = (event: Parameters<typeof setHeader>[0], status: number, message: string) => {
  setHeader(event, 'Cache-Control', 'no-store')
  throw createError({ statusCode: status, message })
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Content-Disposition', 'inline')

  const claim = readMediaToken(String(getRouterParam(event, 'token') ?? ''))
  if (!claim) refuse(event, 403, 'This video link has expired. Reload the page.')
  // Bound to the browser it was made for (the device cookie is HTTP-only, so it can't be copied from the page)
  if (getCookie(event, 'rf_dev') !== claim!.d) refuse(event, 403, 'This video link only works where it was opened.')
  // Paid episodes: still the same signed-in viewer
  if (claim!.v != null && (await currentViewer(event))?.id !== claim!.v) refuse(event, 403, 'Sign in to watch this episode.')
  // Only the player may load it: opening the link in a tab, the address bar or "Save link as" is a
  // navigation (Sec-Fetch-Mode: navigate) and is refused, as is anything not loading it as media.
  // Older browsers don't send these headers; they fall back to the checks above.
  const dest = getHeader(event, 'sec-fetch-dest')
  const mode = getHeader(event, 'sec-fetch-mode')
  if (mode === 'navigate' || (dest && !['video', 'audio', 'empty'].includes(dest))) refuse(event, 403, 'Watch this episode on RuengFlix.')
  rateLimit(event, 'media', 600, 60_000)

  const up = await upstreamFor(claim!.s, claim!.e, claim!.k, claim!.v)
  if (!up) refuse(event, 403, 'This episode is not available.')

  let range = getHeader(event, 'range')
  if (claim!.k === 'preview') {
    // Only the opening: bytes up to the preview length (plus a margin), and the file's last few MB in
    // case its index (moov) sits at the end. Approximate by design; the player also stops on time.
    const size = await sizeOf(up!)
    if (size) {
      // The preview's share of the episode, a quarter more for safety (bitrates vary)
      const share = up!.durationSeconds ? Math.min(1, ((up!.previewSeconds ?? 45) * 1.25 + 2) / up!.durationSeconds) : 0.2
      const cap = Math.ceil(size * share)
      const tail = size - Math.min(4 * 1024 * 1024, Math.ceil(size * 0.03))
      const m = /^bytes=(\d+)-(\d*)$/.exec(range ?? 'bytes=0-')
      const start = m ? Number(m[1]) : 0
      const end = m?.[2] ? Number(m[2]) : size - 1
      if (start >= tail) range = `bytes=${start}-${end}`
      else if (start > cap) refuse(event, 416, 'Preview ended')
      else range = `bytes=${start}-${Math.min(end, cap)}`
    }
  }

  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())
  const res = await fetch(up!.url, { headers: range ? { Range: range } : {}, signal: controller.signal }).catch(() => null)
  if (!res || (res.status !== 200 && res.status !== 206)) {
    upstreams.clear()
    refuse(event, 502, 'The video could not be loaded.')
  }
  setResponseStatus(event, res!.status)
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = res!.headers.get(h)
    if (value) setHeader(event, h, value)
  }
  if (!res!.headers.get('accept-ranges')) setHeader(event, 'accept-ranges', 'bytes')
  return sendStream(event, res!.body!)
})
