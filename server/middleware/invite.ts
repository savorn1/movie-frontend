/**
 * An invite link (?invite=CODE) remembers the code for 30 days, so the reward still counts if the friend
 * looks around first and signs up later. Signing in to a new account uses it (see claimInvite).
 */
export default defineEventHandler((event) => {
  const code = getQuery(event).invite
  if (typeof code !== 'string' || !/^[2-9A-Za-z]{5,16}$/.test(code)) return
  setCookie(event, INVITE_COOKIE, code.toUpperCase(), {
    maxAge: 30 * 86_400,
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/'
  })
})
