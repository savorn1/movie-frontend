import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

interface AdminSessionData {
  admin?: boolean
}

/** Admin needs NUXT_ADMIN_PASSWORD and a NUXT_SESSION_SECRET of at least 32 characters */
export function adminConfigured(event: H3Event) {
  const { adminPassword, sessionSecret } = useRuntimeConfig(event)
  return !!adminPassword && sessionSecret.length >= 32
}

// Encrypted, HTTP-only session cookie; valid for 12 hours
export function adminSession(event: H3Event) {
  return useSession<AdminSessionData>(event, {
    name: 'rf_admin',
    password: useRuntimeConfig(event).sessionSecret,
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, sameSite: 'strict', secure: !import.meta.dev, path: '/' }
  })
}

/** Constant-time password check (hash first so different lengths don't leak through timing) */
export function passwordMatches(event: H3Event, input: string) {
  const digest = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(digest(input), digest(useRuntimeConfig(event).adminPassword))
}

/** 503 when admin isn't configured, 401 when not logged in */
export async function requireAdmin(event: H3Event) {
  if (!adminConfigured(event)) throw createError({ statusCode: 503, message: 'Admin is not configured' })
  const session = await adminSession(event)
  if (!session.data.admin) throw createError({ statusCode: 401, message: 'Admin login required' })
}
