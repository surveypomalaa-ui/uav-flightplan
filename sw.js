/* Service worker UAV Flight Monitoring
   - Halaman utama: jaringan dulu (update langsung terlihat), cache hanya bila offline
   - Pustaka CDN (versi terkunci): cache dulu agar pembukaan berikutnya cepat
   - API Apps Script, tile peta, dan login Google TIDAK disentuh */
const CACHE = 'uav-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo.png'];
const CDN_HOSTS = ['unpkg.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.allSettled(SHELL.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function store_(req, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
  return res;
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {                         // halaman utama
    e.respondWith(
      fetch(req).then(function (res) { return store_('./index.html', res); })
                .catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  if (CDN_HOSTS.indexOf(url.hostname) >= 0) {            // pustaka CDN
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { return store_(req, res); });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {             // ikon, logo, manifest
    e.respondWith(
      fetch(req).then(function (res) { return store_(req, res); })
                .catch(function () { return caches.match(req); })
    );
  }
  // selain itu (Apps Script, tile peta, Google login): biarkan browser menangani
});
