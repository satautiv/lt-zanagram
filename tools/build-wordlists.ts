// Builds the generator's word lists from the approved, pinned sources (spec §7, decision D8;
// sources and licences in data/LICENSES.md).
// Usage: npm run wordlists
//
// Writes data/required.txt (committed) and data/valid.txt (gitignored), applying
// data/blocklist.txt and data/required-overrides.txt. Downloads are cached in data/sources/
// (gitignored) and checked against their SHA-256, so every run builds the same lists.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { toUpper } from '../src/core';
import {
  attestedForms,
  buildRequired,
  buildValid,
  parseOverrides,
  readWordLines,
} from './wordlists/build';
import { parseAff, parseDic } from './wordlists/hunspell';

/** Corpus attestation threshold for valid forms: 2 drops one-off typos and OCR noise. */
const MIN_CORPUS_COUNT = 2;
/** How many lemmas `required.txt` keeps before the author's allows (spec: 5,000–10,000). */
const REQUIRED_SIZE = 8_000;

const SOURCES = {
  hunspell: {
    url: 'https://github.com/ispell-lt/ispell-lt/releases/download/rel-1.3.2/myspell-lt-1.3.2.zip',
    sha256: 'c1b4b5604143b480bf7890470db7f5e38c668053ee4d5b84383fa8c987921f82',
  },
  wordforms: {
    url: 'https://clarin-repo.lt/bitstream/handle/20.500.11821/8/CCLL-Wordlists-2022.zip',
    sha256: 'a7fc944ab4355a8288e56138bd15a627889d47269ee3cbc64fec21e6f102121b',
  },
  lemmas: {
    url: 'https://clarin-repo.lt/bitstream/handle/20.500.11821/77/LT_freq_lists.zip',
    sha256: '74cee83b6d8c286856d0d7b20ef6a5e617785948abe71e49de268f8c55f19330',
  },
} as const;

const data = (name: string) => new URL(`../data/${name}`, import.meta.url);

async function download(source: { url: string; sha256: string }): Promise<Uint8Array> {
  const file = data(`sources/${source.url.split('/').at(-1)}`);
  if (!existsSync(file)) {
    console.log(`Downloading ${source.url}`);
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`);
    mkdirSync(data('sources'), { recursive: true });
    writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
  }
  const bytes = new Uint8Array(readFileSync(file));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== source.sha256) {
    throw new Error(`${file.pathname}: SHA-256 ${sha256}, expected ${source.sha256}`);
  }
  return bytes;
}

/** One text file from a zip archive. */
function unzipText(zip: Uint8Array, path: string): string {
  const files = unzipSync(zip, { filter: (file) => file.name === path });
  const file = files[path];
  if (!file) throw new Error(`${path} not found in archive`);
  return new TextDecoder('utf-8').decode(file);
}

const hunspell = await download(SOURCES.hunspell);
const affixes = parseAff(unzipText(hunspell, 'myspell-lt-1.3.2/lt_LT.aff'));
const dictionary = parseDic(unzipText(hunspell, 'myspell-lt-1.3.2/lt_LT.dic'));
const attested = attestedForms(
  unzipText(
    await download(SOURCES.wordforms),
    'CCLL-Wordlists-2022/byalphabet-2022/freq-visas-abc.txt',
  ),
  MIN_CORPUS_COUNT,
);
const lemmaList = unzipText(await download(SOURCES.lemmas), '4-LT_lemma_alpha_freq_list.txt');

const blocked = new Set(readWordLines(readFileSync(data('blocklist.txt'), 'utf8')).map(toUpper));
const { allow, deny } = parseOverrides(readFileSync(data('required-overrides.txt'), 'utf8'));

const valid = buildValid({ dictionary, affixes, attested, blocked });
const required = buildRequired({
  lemmaList,
  dictionary,
  valid: new Set(valid),
  blocked,
  allow,
  deny,
  size: REQUIRED_SIZE,
});

writeFileSync(data('valid.txt'), valid.join('\n') + '\n');
writeFileSync(data('required.txt'), required.words.join('\n') + '\n');

console.log(`Dictionary entries   ${dictionary.length.toLocaleString('en')}`);
console.log(`Corpus forms seen ≥ ${MIN_CORPUS_COUNT}× ${attested.size.toLocaleString('en')}`);
console.log(`Blocklist            ${blocked.size}`);
console.log(`Overrides            +${allow.size} −${deny.size}`);
console.log(`valid.txt            ${valid.length.toLocaleString('en')} forms`);
console.log(`required.txt         ${required.words.length.toLocaleString('en')} lemmas`);
if (required.rejectedAllows.length > 0) {
  console.warn(`Allowed but not valid, left out: ${required.rejectedAllows.join(', ')}`);
}
