/// <reference lib="webworker" />
// The service worker (spec §9, §10 PWA): the game plays offline after the first visit.
//
// - The app shell (HTML, hashed assets, manifest, icons) is precached per deploy, in a cache named
//   after the build. A new deploy installs a new worker, which takes over at once and drops the
//   old shell, so nobody gets stuck on an old version.
// - Pages and puzzles are network-first, so an online player always gets the latest; every puzzle
//   that was opened is kept for offline play across deploys.
// - Everything else (hashed assets) is cache-first.

declare const self: ServiceWorkerGlobalScope;

// Replaced at build time by the service worker plugin (tools/service-worker-plugin.ts).
declare const __SW_VERSION__: string;
declare const __SW_PRECACHE__: string[];

const SHELL = `shell-${__SW_VERSION__}`;
const PUZZLES = 'puzzles';
/** How long a page request waits for the network before an offline copy is used instead. */
const NAVIGATION_TIMEOUT_MS = 4_000;
/** Servers add `Vary: Origin`, but these same-origin files never differ by request headers. */
const match = (request: Request | string) => caches.match(request, { ignoreVary: true });

const scope = new URL(self.registration.scope);
const shellUrl = new URL('./', scope).href;
const puzzlesPath = new URL('./puzzles/', scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Bypass the HTTP cache so a new deploy never precaches a stale copy.
      await cache.addAll(__SW_PRECACHE__.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('shell-') && name !== SHELL) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, () => match(shellUrl), NAVIGATION_TIMEOUT_MS));
  } else if (url.pathname.startsWith(puzzlesPath)) {
    event.respondWith(networkFirst(request, () => match(request), Infinity, PUZZLES));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

/** The page hands over the puzzles it loaded before this worker was in control. */
self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; urls?: unknown } | null;
  if (data?.type !== 'cache-puzzles' || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter(
    (url): url is string =>
      typeof url === 'string' &&
      new URL(url).origin === scope.origin &&
      new URL(url).pathname.startsWith(puzzlesPath),
  );
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PUZZLES);
      await Promise.all(
        urls.map(async (url) => (await cache.match(url, { ignoreVary: true })) || cache.add(url)),
      );
    })(),
  );
});

/**
 * The network's answer, or the offline copy when the network fails or is slower than `timeoutMs`
 * (and a copy exists). With `store`, good answers are kept in that cache.
 */
async function networkFirst(
  request: Request,
  offlineCopy: () => Promise<Response | undefined>,
  timeoutMs: number,
  store?: string,
): Promise<Response> {
  const network = fetch(request).then(async (response) => {
    if (store && response.ok) await (await caches.open(store)).put(request, response.clone());
    return response;
  });
  network.catch(() => {}); // Handled below; only silences the case where the copy won the race.
  const slow =
    timeoutMs === Infinity
      ? new Promise<never>(() => {})
      : new Promise<undefined>((resolve) => setTimeout(resolve, timeoutMs)).then(offlineCopy);
  try {
    const first = await Promise.race([network, slow]);
    if (first) return first;
  } catch {
    // Offline: fall through to the offline copy.
  }
  const copy = await offlineCopy();
  return copy ?? network;
}

async function cacheFirst(request: Request): Promise<Response> {
  return (await match(request)) ?? fetch(request);
}

export {};
