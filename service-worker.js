// Kill-switch: apaga todos os caches, cancela o registro e recarrega as abas.
// Necessário para remover o SW antigo em quem já visitou o site.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clientList = await clients.matchAll({ type: 'window' });
    clientList.forEach(client => client.navigate(client.url));
  })());
});
