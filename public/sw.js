self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_error) {
      payload = {};
    }
  }

  const title = payload.title || 'Notification';
  const body = payload.body || '';
  const icon = payload.icon || '/logo192.png';
  const badge = payload.badge || '/logo192.png';
  const link = payload.link || '/dashboard/notifications/inbox';
  const tag = payload.tag || 'user-notification';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: {
        link,
        notificationId: payload.data?.notificationId || null,
        type: payload.data?.type || null,
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawLink = event.notification.data?.link || '/dashboard/notifications/inbox';
  const destination = new URL(rawLink, self.location.origin).toString();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const sameOriginClient = clients.find((client) => client.url.startsWith(self.location.origin));

      if (sameOriginClient) {
        return sameOriginClient.navigate(destination).then(() => sameOriginClient.focus());
      }

      return self.clients.openWindow(destination);
    })
  );
});
