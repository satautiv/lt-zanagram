let registered = false;

/**
 * Registers the service worker (src/sw/sw.ts) in production builds, once. Call it after the first
 * puzzle has loaded, with the files it came from: that load happened before the worker existed, so
 * the files are handed over to be kept for offline play.
 */
export function registerServiceWorker(puzzleFiles: readonly string[]): void {
  if (registered || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  registered = true;
  const base = import.meta.env.BASE_URL;
  void (async () => {
    try {
      // `updateViaCache: 'none'` checks for a new deploy on every visit, past the HTTP cache.
      await navigator.serviceWorker.register(`${base}sw.js`, {
        scope: base,
        updateViaCache: 'none',
      });
      const { active } = await navigator.serviceWorker.ready;
      const urls = puzzleFiles.map((path) => new URL(path, location.href).href);
      active?.postMessage({ type: 'cache-puzzles', urls });
    } catch (error) {
      // The game still works online without it.
      console.warn('Service worker registration failed', error);
    }
  })();
}
