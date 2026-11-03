import type { H3Event } from 'h3'

// In-memory, per server instance, reset on restart: enough to stop casual abuse of the
// anonymous endpoints, not a replacement for accounts.
const buckets = new Map<string, number[]>()

/** Throw 429 when this IP has made `max` requests to `name` within `windowMs` */
export function rateLimit(event: H3Event, name: string, max: number, windowMs = 60_000) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${name}:${ip}`
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= max) throw createError({ statusCode: 429, message: 'Too many requests' })
  hits.push(now)
  buckets.set(key, hits)
}
