import type { H3Event } from 'h3'

interface GoogleAttempt {
  state?: string
  verifier?: string
  next?: string
  /** Signed-in viewer to add Google to, instead of signing in */
  linkTo?: number
}

/**
 * One Google sign-in in progress, in an encrypted cookie for 10 minutes. SameSite=Lax so it comes
 * back on Google's redirect to the callback (a top-level navigation).
 */
export function googleAttemptSession(event: H3Event) {
  return useSession<GoogleAttempt>(event, {
    name: 'rf_google',
    password: useRuntimeConfig(event).sessionSecret,
    maxAge: 600,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/api/auth/google' }
  })
}

/** Must match an "Authorized redirect URI" of the Google OAuth client */
export function googleRedirectUri(event: H3Event) {
  return `${useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')}/api/auth/google/callback`
}
