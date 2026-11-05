import type { Puzzle, PuzzleWord } from './puzzle';

/**
 * Puzzle files are committed and served obfuscated (ADR-0001, spec §9): the board stays readable,
 * but words, paths, definitions and extras live in `secret`, XORed with a key derived from the
 * date and base64-encoded. This only stops casual spoilers; it is not security.
 */
export interface EncodedPuzzle {
  id: string;
  size: number;
  letters: string[];
  bridges: Puzzle['bridges'];
  difficulty: number;
  author: string;
  version: number;
  secret: string;
}

interface Secret {
  words: PuzzleWord[];
  extras: string[];
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let text = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i]!;
    let code: number;
    let extra: number;
    if (b < 0x80) [code, extra] = [b, 0];
    else if (b < 0xe0) [code, extra] = [b & 31, 1];
    else if (b < 0xf0) [code, extra] = [b & 15, 2];
    else [code, extra] = [b & 7, 3];
    for (let j = 1; j <= extra; j++) code = (code << 6) | (bytes[i + j]! & 63);
    text += String.fromCodePoint(code);
    i += extra + 1;
  }
  return text;
}

function toBase64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i]!, bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += BASE64[(n >> 18) & 63]! + BASE64[(n >> 12) & 63]!;
    out += b === undefined ? '=' : BASE64[(n >> 6) & 63]!;
    out += c === undefined ? '=' : BASE64[n & 63]!;
  }
  return out;
}

function fromBase64(text: string): number[] {
  const clean = text.replace(/=+$/, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = [...clean.slice(i, i + 4)].map((ch) => {
      const v = BASE64.indexOf(ch);
      if (v < 0) throw new Error('Puzzle secret is not valid base64');
      return v;
    });
    const n =
      (chunk[0]! << 18) | ((chunk[1] ?? 0) << 12) | ((chunk[2] ?? 0) << 6) | (chunk[3] ?? 0);
    bytes.push((n >> 16) & 255);
    if (chunk.length > 2) bytes.push((n >> 8) & 255);
    if (chunk.length > 3) bytes.push(n & 255);
  }
  return bytes;
}

function xor(bytes: number[], id: string): number[] {
  const key = utf8Encode(`zt:${id}`);
  return bytes.map((byte, i) => byte ^ key[i % key.length]!);
}

export function encodePuzzle(puzzle: Puzzle): EncodedPuzzle {
  const { words, extras, ...board } = puzzle;
  const secret: Secret = { words, extras };
  return { ...board, secret: toBase64(xor(utf8Encode(JSON.stringify(secret)), puzzle.id)) };
}

export function decodePuzzle(encoded: EncodedPuzzle): Puzzle {
  const { secret, ...board } = encoded;
  const { words, extras } = JSON.parse(utf8Decode(xor(fromBase64(secret), encoded.id))) as Secret;
  return { ...board, words, extras };
}

export function isEncodedPuzzle(value: unknown): value is EncodedPuzzle {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as EncodedPuzzle).secret === 'string'
  );
}

/** Accepts a puzzle file in either form: encoded (real puzzles) or plain (hand-made fixtures). */
export function readPuzzle(value: unknown): Puzzle {
  return isEncodedPuzzle(value) ? decodePuzzle(value) : (value as Puzzle);
}
