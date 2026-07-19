const CACHE = 'inmu-daifugou-v2'
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
  e.respondWith(
    caches.match(e.request).then(cached => {
      const refreshed = fetch(e.request).then(response => {
        if (response.ok && new URL(e.request.url).origin === self.location.origin) {
          caches.open(CACHE).then(cache => cache.put(e.request, response.clone()))
        }
        return response
      }).catch(() => cached)
      return cached || refreshed
    })
  )
})
