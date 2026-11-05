import type { H3Event } from 'h3'

export const INVITE_COOKIE = 'rf_invite'

/**
 * After signing in: if this browser came through an invite link, tell movie-api who invited the
 * viewer. movie-api only counts brand-new accounts and never one's own code, so an existing viewer
 * signing in just clears the cookie. Never blocks sign-in.
 */
export async function claimInvite(event: H3Event, viewerId: number) {
  const code = getCookie(event, INVITE_COOKIE)
  if (!code) return
  deleteCookie(event, INVITE_COOKIE, { path: '/' })
  try {
    await viewerApi('POST', `/${viewerId}/invited-by`, { code })
  } catch (err) {
    console.warn('[invite]', (err as Error).message)
  }
}
