// Imported into the Workbox-generated service worker (see vite.config.ts's
// `workbox.importScripts`) so a push notification can reach a phone even
// while the tab is minimized or in the background. Workbox owns the
// generated service worker's routing; this file only adds the two push
// listeners Workbox does not generate on its own. Shared by every push
// sender (Admin chat alerts, Tutor/Guardian notifications) - every payload
// carries a `url` to open on click, so this file needs no per-feature logic.
//
// A payload that also carries a `tag` is one of a kind (chat messages, new
// tuitions, notices): the phone keeps ONE notification per tag and updates it
// - "3 messages", the last few lines under it - instead of stacking a new
// pop-up for every message. A page cannot build Android's own app groups;
// this is what a website can do, and what chat apps on the web do.
const MAX_MERGED_LINES = 5;

const isBengali = text => /[ঀ-৿]/.test(text);

const toBengaliDigits = number => String(number).replace(/[0-9]/g, digit => "০১২৩৪৫৬৭৮৯".charAt(Number(digit)));

// `previous` is what the notification already on the screen under this tag
// carried (`undefined` when nothing is there); `incoming` is the new push.
// Returns what the one notification should now say, and what it must remember.
function mergeIntoOne(previous, incoming) {
  const count = (previous?.count ?? 0) + 1;
  const line = incoming.line || incoming.body || incoming.title;
  const lines = (previous?.lines ?? []).filter(text => text !== line).concat(line).slice(-MAX_MERGED_LINES);
  if (count === 1 || !incoming.groupTitle) {
    return { title: incoming.title, body: incoming.body, url: incoming.url || null, count, lines };
  }
  const shown = isBengali(incoming.groupTitle) ? toBengaliDigits(count) : String(count);
  return {
    title: incoming.groupTitle.replace("{n}", shown),
    body: lines.join("\n"),
    url: incoming.groupUrl || incoming.url || null,
    count,
    lines,
  };
}

async function showPush(data) {
  const title = data.title || "Connect Tutors";
  const common = { icon: "/pwa-192x192.png", badge: "/pwa-64x64.png" };
  if (!data.tag) {
    return self.registration.showNotification(title, { body: data.body || "New notification", data: { url: data.url || null }, ...common });
  }
  const [shown] = await self.registration.getNotifications({ tag: data.tag });
  const merged = mergeIntoOne(shown?.data, {
    title,
    body: data.body || "New notification",
    url: data.url,
    line: data.line,
    groupTitle: data.groupTitle,
    groupUrl: data.groupUrl,
  });
  return self.registration.showNotification(merged.title, {
    body: merged.body,
    tag: data.tag,
    // The same tag replaces the notification quietly; this makes the phone sound and buzz again for the new one.
    renotify: true,
    data: { url: merged.url, count: merged.count, lines: merged.lines },
    ...common,
  });
}

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    Promise.all([
      showPush(data),
      // Lets an already-open tab bounce its header bell right away instead of
      // waiting for its next unread-count poll.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
        for (const client of clients) client.postMessage({ type: "push-received" });
      }),
    ])
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

// For the tests only: a service worker has no `module`.
if (typeof module !== "undefined" && module.exports) module.exports = { mergeIntoOne, toBengaliDigits };
