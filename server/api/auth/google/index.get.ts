/*
 * "Continue with Google": sends the browser to Google. ?next=/path comes back there afterwards;
 * ?link=1 adds Google to the signed-in account instead of signing in.
 */
export default defineEventHandler(async (event) => {
  requireAccounts(event)
  rateLimit(event, 'viewer-google', 20, 15 * 60_000)
  const config = useRuntimeConfig(event)
  const query = getQuery(event)
  const next = safeNext(query.next)
  if (!signInMethods(event).google) return sendRedirect(event, `/login?error=UNAVAILABLE&next=${encodeURIComponent(next)}`)

  const linkTo = query.link === '1' ? (await currentViewer(event))?.id : undefined
  const attempt = newGoogleAttempt()
  const session = await googleAttemptSession(event)
  await session.update({ state: attempt.state, verifier: attempt.verifier, next, linkTo })
  return sendRedirect(event, googleAuthorizeUrl(config.googleClientId, googleRedirectUri(event), attempt.state, attempt.challenge))
})
