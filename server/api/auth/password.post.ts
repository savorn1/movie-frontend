/*
 * Change the password: { current, next }. Other devices are signed out; this one stays signed in.
 * "Forgot password": right after signing in with Telegram or Google, { next } alone is enough.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'viewer-password', 10, 15 * 60_000)
  const body = await readBody<{ current?: unknown; next?: unknown }>(event)
  const next = checkPassword(body?.next, 'next')
  if (typeof body?.current !== 'string') {
    if (!(await mayResetPassword(event, viewer))) {
      throw createError({ statusCode: 401, message: 'The current password is wrong', data: { code: 'WRONG_PASSWORD' } })
    }
    const updated = await viewerApi<Viewer>('PUT', `/${viewer.id}/password`, { next, reset: true })
    // Keep this session signed in, but the reset window is used up
    await signIn(event, updated)
    return { viewer: clientViewer(updated) }
  }
  const updated = await viewerApi<Viewer>('PUT', `/${viewer.id}/password`, { current: body.current, next })
  await signIn(event, updated)
  return { viewer: clientViewer(updated) }
})
