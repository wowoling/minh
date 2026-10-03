const CACHE_NAME = 'minh-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})
