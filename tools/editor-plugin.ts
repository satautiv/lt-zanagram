import type { Plugin } from 'vite';
import { readPuzzle, validatePuzzle } from '../src/core';
import { EDITOR_SAVE_PATH } from '../editor/save-path';
import { writeIndex, writePuzzle } from './puzzle-files';

/**
 * Dev server only: lets the editor (/editor.html) save a board straight into the puzzle folder and
 * rebuild index.json, so reviewing a batch needs no downloads. Only valid puzzles are written.
 */
export function editorSave(dir: string): Plugin {
  return {
    name: 'editor-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(EDITOR_SAVE_PATH, (request, response) => {
        const reply = (status: number, body: object) => {
          response.statusCode = status;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(body));
        };
        if (request.method !== 'POST') return reply(405, { error: 'POST only' });
        let body = '';
        request.on('data', (chunk: Buffer) => (body += chunk.toString('utf8')));
        request.on('end', () => {
          try {
            const puzzle = readPuzzle(JSON.parse(body));
            const { ok, errors } = validatePuzzle(puzzle);
            if (!ok) return reply(422, { error: errors.map((e) => e.message).join('; ') });
            writePuzzle(dir, puzzle);
            reply(200, { saved: puzzle.id, puzzles: writeIndex(dir).length });
          } catch (error) {
            reply(400, { error: String(error) });
          }
        });
      });
    },
  };
}
