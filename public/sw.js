self.addEventListener('push', event => {
  if (!event.data) return;

  const payload = event.data.json();
  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(payload.title || 'Orbyt', {
    body: payload.body || 'You have a new notification on Orbyt.',
    icon: payload.icon || '/Images/MainLogoONLY.png',
    data,
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => 'focus' in client);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});