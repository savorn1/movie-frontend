/* RuengFlix service worker: offline page, cached app files, recently visited pages, and new-episode
   notifications (Web Push). Video, the API and subtitles always go to the network. Bump VERSION to
   drop old caches. */
const VERSION = 'v3'
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
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/subtitles/') || url.pathname.startsWith('/admin')) return

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

// ---------- New-episode notifications ----------

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // Not ours
  }
  if (!data.title) return
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    lang: 'km',
    data: { url: data.url || '/' }
  }))
})

// Open the episode, reusing a RuengFlix tab when there is one
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const tab = tabs.find(t => new URL(t.url).origin === target.origin)
    if (tab) {
      await tab.focus()
      return tab.navigate(target.href)
    }
    return self.clients.openWindow(target.href)
  })())
})
