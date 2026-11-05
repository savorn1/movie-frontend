import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/*
 * Checks for "Continue with Telegram" and "Continue with Google". Pure functions, so they can be tested
 * without the providers; the routes in server/api/auth do the network parts.
 */

// ---------- Telegram Login Widget ----------

/** The fields Telegram signs (https://core.telegram.org/widgets/login#checking-authorization) */
const TELEGRAM_FIELDS = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'] as const

export interface TelegramUser {
  id: string
  name: string
  username: string | null
  photoUrl: string | null
}

/** How long a Telegram sign-in stays usable after the person approved it */
export const TELEGRAM_MAX_AGE_SECONDS = 60 * 60

/**
 * The Telegram account in the widget's data when its signature is Telegram's (an HMAC made with the
 * bot token) and it is recent; null otherwise. Fields other than Telegram's own are ignored.
 */
export function verifyTelegramLogin(
  data: Record<string, unknown>,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): TelegramUser | null {
  if (!botToken || typeof data.hash !== 'string' || !/^[0-9a-f]{64}$/.test(data.hash)) return null
  const fields = TELEGRAM_FIELDS.filter(k => data[k] != null && data[k] !== '').map(k => `${k}=${String(data[k])}`)
  const secret = createHash('sha256').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(fields.sort().join('\n')).digest()
  if (!timingSafeEqual(expected, Buffer.from(data.hash, 'hex'))) return null

  const authDate = Number(data.auth_date)
  if (!Number.isFinite(authDate) || nowSeconds - authDate > TELEGRAM_MAX_AGE_SECONDS || authDate - nowSeconds > 60) return null
  const id = String(data.id ?? '')
  if (!/^\d{1,19}$/.test(id)) return null
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
  return {
    id,
    name: name || (typeof data.username === 'string' ? data.username : ''),
    username: typeof data.username === 'string' ? data.username : null,
    photoUrl: typeof data.photo_url === 'string' && data.photo_url.startsWith('https://') ? data.photo_url : null
  }
}

/**
 * Telegram Mini App sign-in: the `initData` string Telegram hands the page inside the app. Checked as
 * Telegram documents for Web Apps: HMAC-SHA256 of the sorted "key=value" lines, keyed with
 * HMAC-SHA256("WebAppData", bot token). Too old (a day) or signed for another bot: null.
 */
export function verifyTelegramWebApp(
  initData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): (TelegramUser & { startParam: string | null }) | null {
  if (!botToken || !initData || initData.length > 4096) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null
  params.delete('hash')
  const lines = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort()
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(lines.join('\n')).digest()
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null

  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate) || nowSeconds - authDate > TELEGRAM_MAX_AGE_SECONDS || authDate - nowSeconds > 60) return null
  let user: Record<string, unknown>
  try {
    user = JSON.parse(params.get('user') ?? '')
  } catch {
    return null
  }
  const id = String(user?.id ?? '')
  if (!/^\d{1,19}$/.test(id)) return null
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return {
    id,
    name: name || (typeof user.username === 'string' ? user.username : ''),
    username: typeof user.username === 'string' ? user.username : null,
    photoUrl: typeof user.photo_url === 'string' && user.photo_url.startsWith('https://') ? user.photo_url : null,
    startParam: params.get('start_param')
  }
}

// ---------- Google (OpenID Connect, authorization code flow with PKCE) ----------

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

export interface GoogleUser {
  sub: string
  name: string
  /** Only when Google has verified it */
  email: string | null
  photoUrl: string | null
}

const base64url = (buf: Buffer) => buf.toString('base64url')

/** A random state and PKCE verifier for one sign-in, and the challenge sent to Google */
export function newGoogleAttempt() {
  const verifier = base64url(randomBytes(32))
  return {
    state: base64url(randomBytes(24)),
    verifier,
    challenge: base64url(createHash('sha256').update(verifier).digest())
  }
}

export function googleAuthorizeUrl(clientId: string, redirectUri: string, state: string, challenge: string) {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  })
  return `${GOOGLE_AUTHORIZE_URL}?${q}`
}

/**
 * The account in an ID token received straight from Google's token endpoint over TLS. Its signature
 * needn't be checked in that case (OpenID Connect Core 3.1.3.7), but who issued it, for whom, and
 * until when must be. Null when any check fails.
 */
export function googleIdTokenUser(idToken: string, clientId: string, nowSeconds = Math.floor(Date.now() / 1000)): GoogleUser | null {
  const payload = idToken.split('.')[1]
  if (!payload) return null
  let claims: Record<string, unknown>
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!GOOGLE_ISSUERS.includes(String(claims.iss)) || !audience.includes(clientId)) return null
  if (typeof claims.exp !== 'number' || claims.exp < nowSeconds) return null
  if (typeof claims.sub !== 'string' || !/^[\w-]{1,255}$/.test(claims.sub)) return null
  const email = claims.email_verified === true && typeof claims.email === 'string' ? claims.email : null
  return {
    sub: claims.sub,
    name: typeof claims.name === 'string' ? claims.name : (email?.split('@')[0] ?? ''),
    email,
    photoUrl: typeof claims.picture === 'string' && claims.picture.startsWith('https://') ? claims.picture : null
  }
}

/** Only paths on this site, so a sign-in can't be used to send someone elsewhere */
export function safeNext(next: unknown, fallback = '/library') {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback
}
