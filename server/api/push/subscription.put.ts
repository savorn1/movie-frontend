/*
 * Save this browser's Web Push subscription ({ subscription: PushSubscription.toJSON() }); returns the
 * series it already gets pushes for. Tied to the signed-in viewer when there is one.
 */
export default defineEventHandler(async (event) => {
  if (!pushEnabled()) throw createError({ statusCode: 503, message: 'Push is not set up' })
  rateLimit(event, 'push-subscribe', 20, 60_000)
  const body = await readBody<{ subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } }>(event)
  const sub = body?.subscription
  if (typeof sub?.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string') {
    throw createError({ statusCode: 400, message: 'Expected { subscription }' })
  }
  const viewer = await currentViewer(event)
  return apiCall<{ id: number; following: number[] }>('PUT', '/push/subscriptions', {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    ...(viewer ? { viewerId: viewer.id } : {})
  })
})
