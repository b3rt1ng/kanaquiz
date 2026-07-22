workbox.precaching.precacheAndRoute(self.__precacheManifest);

// Pairs with wb.messageSW({ type: "SKIP_WAITING" }) in index.js - without
// this listener, clicking the "new version available" button sends the
// message but nothing ever calls skipWaiting(), so the waiting worker
// never activates and the page never actually reloads onto the new version.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

