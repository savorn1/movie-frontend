export default defineEventHandler(async (event) => {
  if (!adminConfigured(event)) throw createError({ statusCode: 503, message: 'Admin is not configured' })
  // Slow down password guessing
  rateLimit(event, 'admin-login', 10, 15 * 60_000)

  const { password } = await readBody<{ password?: string }>(event)
  if (typeof password !== 'string' || !passwordMatches(event, password)) {
    throw createError({ statusCode: 401, message: 'Wrong password' })
  }
  const session = await adminSession(event)
  await session.update({ admin: true })
  return { ok: true }
})
