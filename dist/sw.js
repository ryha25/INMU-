const CACHE = 'inmu-daifugou-v3'
const PRECACHE = ['/', '/index.html', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  // Authentication and API requests must always reach the server and must never be cached.
  if (url.origin === self.location.origin && (url.pathname.startsWith('/api/') || url.searchParams.has('portalLink'))) return
  e.respondWith(
    caches.match(e.request).then(cached => {
      const refreshed = fetch(e.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          caches.open(CACHE).then(cache => cache.put(e.request, response.clone()))
        }
        return response
      }).catch(() => cached)
      return cached || refreshed
    })
  )
})
