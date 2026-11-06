// Rebuilds public/puzzles/index.json (dates + difficulty) from the puzzle files in that folder.
// Usage: npm run puzzles:index
import { writeIndex } from './puzzle-files';

const entries = writeIndex('public/puzzles');
console.log(`index.json: ${entries.length} puzzles, ${entries[0]?.date} … ${entries.at(-1)?.date}`);
