/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ayarGuncelle, ayarlariAl } from './db/db';
import { sabahOzeti } from './lib/sabah';
import { bugunStr } from './lib/util';

declare const self: ServiceWorkerGlobalScope;

// Uygulama kabuğu önbellekte: çevrimdışıyken dolap ve kombinler açılır (bölüm 9)
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'fonts', plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
);
// Arka plan silme modeli ilk kullanımda iner, sonra buradan çevrimdışı çalışır
registerRoute(
  ({ url }) => url.origin === 'https://staticimgly.com',
  new CacheFirst({ cacheName: 'bg-model', plugins: [new ExpirationPlugin({ maxEntries: 80 })] }),
);

// ---- Sabah bildirimi ----
// Periodic Background Sync sadece Chromium tabanlı tarayıcılarda, ana ekrana eklenmiş uygulamada çalışır.
// Tarayıcı zamanı kendisi seçer; biz sabah saatlerinde ve günde bir kez göstermekle sınırlarız.

type PeriodicSyncEvent = ExtendableEvent & { tag: string };

async function sabahBildirimi(zorla = false) {
  const ayarlar = await ayarlariAl();
  if (!ayarlar.bildirim && !zorla) return;
  const saat = new Date().getHours();
  if (!zorla && (saat < 6 || saat >= 11 || ayarlar.sonBildirim === bugunStr())) return;
  const ozet = await sabahOzeti();
  if (!ozet) return;
  await self.registration.showNotification(ozet.baslik, {
    body: ozet.govde,
    icon: new URL('icon-192.png', self.registration.scope).href,
    badge: new URL('icon-192.png', self.registration.scope).href,
    tag: 'sabah-kombin',
    lang: 'tr',
    data: { url: self.registration.scope },
  });
  if (!zorla) await ayarGuncelle({ sonBildirim: bugunStr() });
}

self.addEventListener('periodicsync', ((e: PeriodicSyncEvent) => {
  if (e.tag === 'sabah-kombin') e.waitUntil(sabahBildirimi());
}) as EventListener);

self.addEventListener('message', (e) => {
  if (e.data?.tip === 'sabah-deneme') e.waitUntil(sabahBildirimi(true));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    (async () => {
      const pencereler = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const acik = pencereler.find((p) => 'focus' in p);
      if (acik) return (acik as WindowClient).focus();
      return self.clients.openWindow(e.notification.data?.url ?? self.registration.scope);
    })(),
  );
});
