// Imported into the Workbox-generated service worker (see vite.config.ts's
// `workbox.importScripts`) so a push notification can reach a phone even
// while the tab is minimized or in the background. Workbox owns the
// generated service worker's routing; this file only adds the two push
// listeners Workbox does not generate on its own. Shared by every push
// sender (Admin chat alerts, Tutor/Guardian notifications) - every payload
// carries a `url` to open on click, so this file needs no per-feature logic.
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Connect Tutors";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "New notification",
      icon: "/pwa-192x192.png",
      badge: "/pwa-64x64.png",
      data: { url: data.url || null },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      const [firstClient] = clients;
      if (firstClient && "navigate" in firstClient && "focus" in firstClient) {
        return firstClient.navigate(url).then(() => firstClient.focus());
      }
      return self.clients.openWindow(url);
    })
  );
});
