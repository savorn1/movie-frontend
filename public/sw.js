/* RuengFlix service worker: offline page, cached app files, and recently visited pages.
   Video, the API and subtitles always go to the network. Bump VERSION to drop old caches. */
const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const ASSETS = `assets-${VERSION}`
const PAGES = `pages-${VERSION}`
const PAGE_LIMIT = 30

const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  const keep = [SHELL, ASSETS, PAGES]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/subtitles/')) return

  // Pages: network first, then the last copy of that page, then the offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(PAGES).then(c => c.put(req, copy)).then(() => trim(PAGES, PAGE_LIMIT))
          }
          return res
        })
        .catch(async () => (await caches.match(req)) || caches.match('/offline.html'))
    )
    return
  }

  // Build output has content-hashed names, so a cached copy is always correct
  if (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(ASSETS).then(c => c.put(req, copy))
        }
        return res
      }))
    )
  }
})
