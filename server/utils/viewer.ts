import type { H3Event } from 'h3'

/*
 * Viewer accounts: phone number + password, stored in VideoLingo's database through movie-api.
 * The signed-in viewer is kept in an encrypted, HTTP-only cookie (NUXT_SESSION_SECRET) holding their
 * id and the session version they signed in with; movie-api raises that version to sign them out
 * everywhere (password change, or disabled in the admin portal).
 */

export interface Viewer {
  id: number
  /** "012 345 678" */
  phone: string
  displayName: string
  disabled: boolean
  sessionVersion: number
  createdAt: string
}

interface ViewerSessionData {
  viewerId?: number
  version?: number
}

/** Accounts need movie-api and a NUXT_SESSION_SECRET of at least 32 characters */
export function viewerAccountsEnabled(event: H3Event) {
  return movieApiEnabled() && useRuntimeConfig(event).sessionSecret.length >= 32
}

// Two months, renewed on each visit that reads it
export function viewerSession(event: H3Event) {
  return useSession<ViewerSessionData>(event, {
    name: 'rf_viewer',
    password: useRuntimeConfig(event).sessionSecret,
    maxAge: 60 * 60 * 24 * 60,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/' }
  })
}

export function requireAccounts(event: H3Event) {
  if (!viewerAccountsEnabled(event)) {
    throw createError({ statusCode: 503, message: 'Accounts are not available', data: { code: 'UNAVAILABLE' } })
  }
}

/**
 * A call to movie-api's /viewers routes. Unlike apiCall, movie-api's status and error `code` pass
 * through (401 WRONG_LOGIN, 409 PHONE_TAKEN…), so pages can say what went wrong; only an unreachable
 * movie-api becomes a 502.
 */
export async function viewerApi<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: object): Promise<T> {
  try {
    return (await $fetch(`${movieApiBase()}/viewers${path}`, { method, body, headers: authHeaders(), timeout: 8000 })) as T
  } catch (err) {
    const e = err as { statusCode?: number; data?: { code?: string; message?: string | string[] } }
    if (e.statusCode && e.statusCode < 500) {
      const message = Array.isArray(e.data?.message) ? e.data.message.join('; ') : (e.data?.message ?? 'Request failed')
      throw createError({ statusCode: e.statusCode, message, data: { code: e.data?.code } })
    }
    console.warn(`[viewers] ${method} ${path} failed:`, e.statusCode ?? (err as Error).message)
    throw createError({ statusCode: 502, message: 'movie-api is unreachable', data: { code: 'UNREACHABLE' } })
  }
}

export async function signIn(event: H3Event, viewer: Viewer) {
  const session = await viewerSession(event)
  await session.update({ viewerId: viewer.id, version: viewer.sessionVersion })
}

/** The signed-in viewer, or null; a disabled account or an outdated session is signed out here */
export async function currentViewer(event: H3Event): Promise<Viewer | null> {
  if (!viewerAccountsEnabled(event)) return null
  const session = await viewerSession(event)
  const { viewerId, version } = session.data
  if (!viewerId) return null
  let viewer: Viewer | null = null
  try {
    viewer = await viewerApi<Viewer>('GET', `/${viewerId}`)
  } catch (err) {
    // movie-api down: keep the session, but nobody is signed in for this request
    if ((err as { statusCode?: number }).statusCode === 502) return null
  }
  if (!viewer || viewer.disabled || viewer.sessionVersion !== version) {
    await session.clear()
    return null
  }
  return viewer
}

export async function requireViewer(event: H3Event): Promise<Viewer> {
  requireAccounts(event)
  const viewer = await currentViewer(event)
  if (!viewer) throw createError({ statusCode: 401, message: 'Sign in first', data: { code: 'SIGNED_OUT' } })
  return viewer
}

/** Checks the form before bothering movie-api; same limits as movie-api */
export function checkPassword(password: unknown, field = 'password'): string {
  if (typeof password !== 'string' || password.length < 8) {
    throw createError({ statusCode: 400, message: `${field} must be at least 8 characters`, data: { code: 'PASSWORD_SHORT' } })
  }
  if (password.length > 128) {
    throw createError({ statusCode: 400, message: `${field} is too long`, data: { code: 'PASSWORD_LONG' } })
  }
  return password
}
