/** Create an account and sign in: { phone, password, displayName } */
export default defineEventHandler(async (event) => {
  requireAccounts(event)
  rateLimit(event, 'viewer-register', 5, 60 * 60_000)
  const body = await readBody<{ phone?: unknown; password?: unknown; displayName?: unknown }>(event)
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : ''
  if (!displayName || displayName.length > 60) {
    throw createError({ statusCode: 400, message: 'Enter a name of up to 60 characters', data: { code: 'NAME_REQUIRED' } })
  }
  if (typeof body?.phone !== 'string' || !body.phone.trim()) {
    throw createError({ statusCode: 400, message: 'Enter a phone number', data: { code: 'PHONE_INVALID' } })
  }
  const viewer = await viewerApi<Viewer>('POST', '', { phone: body.phone, password: checkPassword(body.password), displayName })
  await signIn(event, viewer)
  return { viewer }
})
