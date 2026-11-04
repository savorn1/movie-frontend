/*
 * Google sends the browser back here with ?code&state (or ?error). The state must match the one this
 * browser started with; the code is exchanged for an ID token with the client secret and the PKCE
 * verifier. Problems go back to /login?error=CODE.
 */
export default defineEventHandler(async (event) => {
  requireAccounts(event)
  const config = useRuntimeConfig(event)
  const session = await googleAttemptSession(event)
  const attempt = { ...session.data }
  await session.clear()
  const next = safeNext(attempt.next)
  const fail = (code: string) => sendRedirect(event, `/login?error=${code}&next=${encodeURIComponent(next)}`)

  const query = getQuery(event)
  if (query.error) return fail(query.error === 'access_denied' ? 'CANCELLED' : 'GOOGLE_FAILED')
  if (!attempt.state || !attempt.verifier || query.state !== attempt.state || typeof query.code !== 'string') {
    return fail('GOOGLE_EXPIRED')
  }

  let idToken: string | undefined
  try {
    const tokens = await $fetch<{ id_token?: string }>(config.googleTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: query.code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: googleRedirectUri(event),
        grant_type: 'authorization_code',
        code_verifier: attempt.verifier
      }).toString(),
      timeout: 8000
    })
    idToken = tokens.id_token
  } catch (err) {
    console.warn('[google] token exchange failed:', (err as { statusCode?: number }).statusCode ?? (err as Error).message)
  }
  const user = idToken ? googleIdTokenUser(idToken, config.googleClientId) : null
  if (!user) return fail('GOOGLE_FAILED')

  // Linking needs the same person still signed in
  const current = attempt.linkTo != null ? await currentViewer(event) : null
  if (attempt.linkTo != null && current?.id !== attempt.linkTo) return fail('SIGNED_OUT')

  try {
    const viewer = await viewerIdentity({
      provider: 'google',
      subject: user.sub,
      displayName: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      linkTo: attempt.linkTo
    })
    await signIn(event, viewer, true)
  } catch (err) {
    // viewerApi passes movie-api's code through (DISABLED, IDENTITY_TAKEN)
    const code = (err as { data?: { code?: string } }).data?.code
    return fail(code ?? 'GOOGLE_FAILED')
  }
  return sendRedirect(event, next)
})
