/* Service worker của Khoa Physics: giúp web mở được cả khi mất mạng.
   Khi sửa web mà muốn máy người dùng nhận bản mới ngay, đổi số v1 -> v2 ở dòng dưới. */
const VERSION = 'khoa-physics-v2';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'khoa-icon-192.png', 'khoa-icon-512.png', 'khoa-icon-maskable-512.png', 'khoa-apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Mở trang: ưu tiên bản mới từ mạng, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // File khác (CSS, ảnh, thư viện, đề...): dùng bản đã lưu cho nhanh, đồng thời cập nhật ngầm
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
