const CACHE_NAME = 'waymark-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/waymark-icon.svg'];

function isSensitiveRequest(url) {
  const pathname = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();

  return (
    pathname.startsWith('/api/') ||
    pathname.includes('/auth/') ||
    pathname.includes('supabase') ||
    search.includes('token=') ||
    search.includes('access_token=') ||
    search.includes('session=')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isSensitiveRequest(requestUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.destination !== 'document') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
