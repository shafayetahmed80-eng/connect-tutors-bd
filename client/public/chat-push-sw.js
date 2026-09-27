// Imported into the Workbox-generated service worker (see vite.config.ts's
// `workbox.importScripts`) so a Tutor's new chat message can reach an Admin
// even while the tab is minimized or in the background. Workbox owns the
// generated service worker's routing; this file only adds the two push
// listeners Workbox does not generate on its own.
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
      body: data.body || "New message",
      icon: "/pwa-192x192.png",
      badge: "/pwa-64x64.png",
      data: { tutorId: data.tutorId || null },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const tutorId = event.notification.data?.tutorId;
  const url = tutorId ? `/admin/tutor-chats?tutorId=${tutorId}` : "/admin/tutor-chats";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes("/admin/tutor-chats") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
