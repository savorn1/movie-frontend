/** Sign in: { phone, password } */
export default defineEventHandler(async (event) => {
  requireAccounts(event)
  // Slow down password guessing
  rateLimit(event, 'viewer-login', 10, 15 * 60_000)
  const body = await readBody<{ phone?: unknown; password?: unknown }>(event)
  if (typeof body?.phone !== 'string' || typeof body?.password !== 'string' || body.password.length > 128) {
    throw createError({ statusCode: 401, message: 'Wrong phone number or password', data: { code: 'WRONG_LOGIN' } })
  }
  const viewer = await viewerApi<Viewer>('POST', '/login', { phone: body.phone, password: body.password })
  await signIn(event, viewer)
  return { viewer }
})
