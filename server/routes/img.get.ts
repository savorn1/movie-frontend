import { createHash } from 'node:crypto'
import { IMAGE_WIDTHS } from '#shared/utils/imageSizes'

/*
 * GET /img?u=<artwork url>&w=<width>: catalog artwork resized (WebP when the browser takes it, else
 * JPEG) and cached. Only URLs that are a series' poster, vertical or banner are fetched, so this can't
 * be used to load arbitrary addresses through our server. Without `sharp` (or if it fails) the browser
 * is sent to the original image instead.
 */
const MAX_BYTES = 15 * 1024 * 1024
let artwork: { at: number; urls: Set<string> } | null = null
const inFlight = new Map<string, Promise<Buffer | null>>()

async function isArtwork(url: string) {
  if (!artwork || Date.now() - artwork.at > 60_000) {
    const urls = new Set<string>()
    for (const m of await getCatalog()) for (const u of [m.poster, m.vertical, m.banner]) if (u) urls.add(u)
    artwork = { at: Date.now(), urls }
  }
  return artwork.urls.has(url)
}

async function resize(url: string, width: number, webp: boolean): Promise<Buffer | null> {
  let sharp: typeof import('sharp')
  try {
    sharp = (await import('sharp')).default
  } catch {
    return null
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return null
  const input = Buffer.from(await res.arrayBuffer())
  if (input.byteLength > MAX_BYTES) return null
  try {
    const pipeline = sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width, withoutEnlargement: true })
    return await (webp ? pipeline.webp({ quality: 78 }) : pipeline.jpeg({ quality: 80, mozjpeg: true })).toBuffer()
  } catch {
    return null // Not an image sharp can read: let the browser try the original
  }
}

export default defineEventHandler(async (event) => {
  const { u, w } = getQuery(event)
  const url = typeof u === 'string' ? u : ''
  const width = Number(w)
  if (!(IMAGE_WIDTHS as readonly number[]).includes(width) || !(await isArtwork(url))) {
    throw createError({ statusCode: 400, statusMessage: 'Not catalog artwork' })
  }
  const webp = (getHeader(event, 'accept') ?? '').includes('image/webp')
  const type = webp ? 'image/webp' : 'image/jpeg'
  const key = `${createHash('sha256').update(url).digest('hex').slice(0, 32)}-${width}.${webp ? 'webp' : 'jpg'}`
  const store = useStorage('images')

  let body = (await store.getItemRaw<Buffer>(key)) ?? null
  if (!body) {
    let job = inFlight.get(key)
    if (!job) {
      job = resize(url, width, webp).finally(() => inFlight.delete(key))
      inFlight.set(key, job)
    }
    body = await job
    if (!body) return sendRedirect(event, url, 302)
    await store.setItemRaw(key, body)
  }
  setHeaders(event, {
    'content-type': type,
    'cache-control': 'public, max-age=604800, stale-while-revalidate=86400',
    'vary': 'Accept',
    'x-content-type-options': 'nosniff'
  })
  return Buffer.isBuffer(body) ? body : Buffer.from(body as Uint8Array)
})
