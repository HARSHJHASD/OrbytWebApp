// Activate new versions immediately and take control of open tabs, so pushes and
// notification clicks are handled by the current worker without a second reload.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    // A non-JSON payload used to throw here and the push was silently dropped.
    payload = { body: event.data.text() };
  }
  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(payload.title || 'Orbyt', {
    body: payload.body || 'You have a new notification on Orbyt.',
    icon: payload.icon || '/Images/MainLogoONLY.png',
    badge: '/Images/MainLogoONLY.png',
    // Same tag = replace instead of stacking duplicates of one notification.
    tag: data.notificationId || undefined,
    data,
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/app', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) {
      try {
        // navigate() only works on tabs this worker controls; it rejects otherwise,
        // which used to leave the click doing nothing.
        const navigated = await existing.navigate(target);
        return (navigated || existing).focus();
      } catch (e) {
        await existing.focus();
        existing.postMessage({ type: 'navigate', url: target });
        return;
      }
    }
    return self.clients.openWindow(target);
  })());
});
