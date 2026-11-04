/** Change the password: { current, next }. Other devices are signed out; this one stays signed in. */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  rateLimit(event, 'viewer-password', 10, 15 * 60_000)
  const body = await readBody<{ current?: unknown; next?: unknown }>(event)
  if (typeof body?.current !== 'string') {
    throw createError({ statusCode: 401, message: 'The current password is wrong', data: { code: 'WRONG_PASSWORD' } })
  }
  const updated = await viewerApi<Viewer>('PUT', `/${viewer.id}/password`, { current: body.current, next: checkPassword(body.next, 'next') })
  await signIn(event, updated)
  return { viewer: updated }
})
