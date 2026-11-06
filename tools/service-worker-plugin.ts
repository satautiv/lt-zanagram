import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Public files the service worker never precaches: puzzles are cached as they are opened. */
const notPrecached = (path: string) => path.startsWith('puzzles/');

/**
 * Builds `src/sw/sw.ts` into `sw.js` at the site root and fills in its precache list (every built
 * file but the worker itself, plus the public files) and a version that changes with every deploy
 * whose files differ.
 */
export function serviceWorker(entry: string): Plugin {
  let publicDir = '';
  return {
    name: 'service-worker',
    apply: 'build',
    // After Vite's HTML plugin, so index.html is in the bundle.
    enforce: 'post',
    config: () => ({
      build: {
        rollupOptions: {
          input: { index: 'index.html', sw: entry },
          output: {
            entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
          },
        },
      },
    }),
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const worker = bundle['sw.js'];
      if (worker?.type !== 'chunk') throw new Error('service worker chunk is missing');
      if (worker.imports.length) throw new Error('the service worker must not share code chunks');

      const built = Object.values(bundle)
        .filter((file) => file.fileName !== 'sw.js')
        // Every browser that runs a service worker reads woff2; skip the woff fallbacks.
        .filter((file) => !file.fileName.endsWith('.woff'))
        .map((file) => (file.fileName === 'index.html' ? './' : file.fileName));
      const precache = [...built, ...publicFiles(publicDir).filter((p) => !notPrecached(p))].sort();

      const hash = createHash('sha256');
      for (const file of Object.values(bundle)) {
        if (file.fileName === 'sw.js') continue;
        hash.update(file.fileName);
        hash.update(file.type === 'chunk' ? file.code : file.source);
      }
      hash.update(worker.code);
      const version = hash.digest('hex').slice(0, 12);

      worker.code = worker.code
        .replaceAll('__SW_VERSION__', JSON.stringify(version))
        .replaceAll('__SW_PRECACHE__', JSON.stringify(precache));
    },
  };
}

function publicFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
}
