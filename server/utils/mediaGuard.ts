import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/*
 * Video links that are useless when copied. The player never sees the storage address: it gets
 *   /media/<token>
 * where the token is signed by this server, names the series, episode and kind (full or preview),
 * expires after TOKEN_MINUTES, and is bound to this browser (a random device cookie) and, for paid
 * episodes, to the signed-in viewer. /media checks all of that, then passes the video through from
 * storage (routes/media/[token].get.ts). A link pasted elsewhere, opened in another browser, or used
 * after it expires gets nothing.
 *
 * This raises the bar; it doesn't make copying impossible. A viewer can still screen-record, or replay
 * requests with their own cookies. The watermark in the player is what traces those.
 */
export const TOKEN_MINUTES = 20
const DEVICE_COOKIE = 'rf_dev'

export interface MediaClaim {
  /** Series and episode */
  s: number
  e: number
  /** full episode, only the free preview's opening, or the episode's Khmer voice-over track */
  k: 'full' | 'preview' | 'dub'
  /** Signed-in viewer the link was made for (paid episodes) */
  v?: number
  /** Device cookie it was made for */
  d: string
  /** Expires (seconds since epoch) */
  x: number
}

// Without a session secret (sample setup) a per-process key: links just stop working on restart,
// and the player asks for fresh ones
let fallbackKey: Buffer | null = null
function key(): Buffer {
  const secret = useRuntimeConfig().sessionSecret
  if (secret && secret.length >= 32) return createHmac('sha256', secret).update('media-links').digest()
  fallbackKey ??= randomBytes(32)
  return fallbackKey
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const sign = (body: string) => createHmac('sha256', key()).update(body).digest()

/** This browser's device id (made on first use; HTTP-only, so page scripts can't read or copy it) */
export function deviceId(event: H3Event): string {
  // Several links are made per request: they must all get the same new id
  if (event.context.rfDevice) return event.context.rfDevice as string
  let id = getCookie(event, DEVICE_COOKIE)
  if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    id = randomBytes(18).toString('base64url')
    setCookie(event, DEVICE_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 365 * 86_400 })
  }
  event.context.rfDevice = id
  return id
}

/** A /media link for this browser (and viewer) */
export function mediaLink(event: H3Event, claim: Omit<MediaClaim, 'd' | 'x'>): string {
  const full: MediaClaim = { ...claim, d: deviceId(event), x: Math.floor(Date.now() / 1000) + TOKEN_MINUTES * 60 }
  const body = b64(JSON.stringify(full))
  return `/media/${body}.${b64(sign(body))}`
}

/** The claim inside a token, if the signature is ours and it hasn't expired; null otherwise */
export function readMediaToken(token: string): MediaClaim | null {
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = sign(body)
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const claim = JSON.parse(Buffer.from(body, 'base64url').toString()) as MediaClaim
    return claim.x * 1000 > Date.now() ? claim : null
  } catch {
    return null
  }
}

/** HLS playlists list their own segment links, which this can't rewrite yet: those pass through as they are */
export const isPlaylist = (url: string) => /\.m3u8(\?|$)/i.test(url)
