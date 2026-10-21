// Service Worker - Locket Streak Web Push Notification
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Lắng nghe sự kiện Push từ hệ điều hành (kể cả khi đã đóng web/màn hình khóa)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Locket Streak',
    body: 'Đã duy trì chuỗi Locket thành công!',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: { url: '/dashboard' }
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (_) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/assets/icon-192.png',
    badge: payload.badge || '/assets/icon-192.png',
    vibrate: [200, 100, 200],
    tag: `locket-streak-${Date.now()}`,
    renotify: true,
    data: payload.data || { url: '/dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Khi người dùng bấm vào thông báo: mở hoặc chuyển sang tab dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
