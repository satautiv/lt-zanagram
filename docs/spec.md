# Žodžių tiltai — game specification

Source: `Žodžių tiltai — game specification.pdf` (Nov 5, 2026, @Vytautas), converted to Markdown so agents can read it, with the decisions from the 2026-11-05 grilling session folded in. Where this file and the PDF disagree, **this file wins**; every change from the PDF is marked _(decided)_ and listed in [section 12](#12-decisions-log). Vocabulary follows [`GLOSSARY.md`](../GLOSSARY.md).

## 1. Overview

Build a daily Lithuanian word puzzle: 16 letters on a 4×4 grid, joined by "bridges", hide 10–16 Lithuanian words that the player finds by tracing paths. Found words fall away, the board empties, and the last word usually uses every remaining letter.

The reference is Zanagrams on pzlgames.com (played on 2026-11-05: the Oct 26 and Nov 3 boards). Copy the mechanics and the calm dark look, not the name, logo or puzzles. Working title: Žodžių tiltai ("word bridges"); the final name is an open human decision.

Goals for v1:

- Web game first, mobile-first layout, works offline after first load, deployable as a static site (GitHub Pages).
- One new puzzle per day plus a playable archive.
- A generator + authoring tool so new Lithuanian puzzles can be produced without hand-crafting every board.
- Code structured so an Android wrapper and ad slots can be added later without rewrites.

Out of scope for v1: accounts, server-side global statistics, the 5×5 "Master" variant (design for it, ship later), the v2 backend, choosing an ad network, replaying finished puzzles.

## 2. Rules of play

The player wins by finding every required word; everything else is optional. These rules were confirmed by playing the reference game.

1. The board is 16 letter tiles in a 4×4 grid. Tiles are connected by bridges to some of their 8 neighbours (horizontal, vertical, diagonal). Two diagonal bridges may cross inside the same 2×2 square.
2. A word is a path: a sequence of tiles where each consecutive pair is joined by a visible bridge, and no tile is used twice in one word.
3. Words must be at least 4 letters long.
4. Each puzzle has a fixed set of required words (10–16 on a 4×4 board; the Oct 26 board had 14, Nov 3 had 13). The header shows how many remain.
5. Tiles are shared: one tile can belong to several required words.
6. A tile or bridge disappears only when no unfound required word still needs it. So the board does not shrink after the first find, then empties steadily.
7. Valid dictionary words that are not required are extra words. They are optional, are listed separately on the results screen, and each one takes 10 seconds off the final time.
8. Required words can be found in any order. The final word is often long and covers all remaining tiles (Oct 26 ended with MILITANT, 8 letters; NOMINATION, 10 letters, was required too).
9. There is no time limit. A timer counts up (hidden by default), pauses when the game is not visible, and the final time is shown on completion.
10. The player gets 3 hints per puzzle. "Give up" reveals the remaining words and ends the puzzle as given up.
11. _(decided)_ A solved or given-up puzzle is finished: reopening it (from the archive or on reload) goes straight to its results screen. No replay in v1.

## 3. Board and data model

A puzzle is a static JSON file: letters, bridges, and each required word with its canonical path. Everything the board shows is derived from the unfound words.

Tiles are indexed row-major, 0–15 (index = row × size + col). `size` is a field so the 5×5 variant reuses the same code.

```json
{
  "id": "2026-11-05",
  "size": 4,
  "letters": ["N", "A", "M", "Ą", "...16 single Lithuanian letters, uppercase"],
  "bridges": [[0, 1], [1, 2], [1, 6], "...pairs of tile indices, a < b"],
  "words": [
    { "word": "NAMAS", "path": [0, 1, 2, 7, 11], "definition": "Pastatas, kuriame gyvenama." }
  ],
  "extras": ["...every other valid word traceable on the full board, from the generator"],
  "difficulty": 2,
  "author": "Vytautas",
  "version": 1
}
```

(The letters above are placeholders that show the format; real puzzles come from the generator in section 8.)

**Validation rules** for a puzzle (enforced by a `validatePuzzle()` used in tests, the generator and the editor):

- `letters.length == size²`; every letter is in the Lithuanian alphabet (section 6).
- Every bridge joins two tiles that are 8-neighbours.
- Every word's path spells `word`, has no repeated tile, length ≥ 4, and every consecutive pair is a declared bridge.
- Coverage: the union of all required paths uses every tile and every bridge. No orphan bridges, no orphan tiles.
- Every required word is in the required-word list; no duplicate words.

**Runtime state:** `found: Set<word>` (required words found), `extras: string[]`, `hintsUsed`, `hintTarget`, `elapsedMs`, `status: playing | solved | gaveUp`.

- Visible tiles = every tile on the path of at least one unfound required word. Visible bridges = every bridge that is a consecutive pair in at least one unfound required path.
- Recompute visibility after each find; animate tiles and bridges that drop out (fade + shrink, about 300 ms).

**Matching rule:** a submission counts as a required word if it equals an unfound required word, regardless of which path the player traced. Removal always uses the stored canonical path, so the designed board state is preserved. Players can only trace on visible tiles and bridges.

## 4. Input and feedback

Three input methods build the same "current path"; all of them are needed, as in the reference game.

**Drag (touch and mouse)** — use Pointer Events.

- Pointer down on a visible tile starts a path. Moving onto a bridged neighbour appends it. Moving back onto the previous tile removes the last tile.
- Hit area for entering a tile while dragging is about 65% of the tile's radius, so diagonal moves don't catch the orthogonal neighbours.
- Releasing submits the path. A single tile, or a tile not bridged to the last one, is ignored.

**Tap** — tap a tile to start, tap a bridged neighbour to extend, tap the previous tile to step back, tap the last tile again to submit. Tapping a non-adjacent tile starts a new path from it.

**Keyboard typing** — the player types the word; the game finds it on the board.

- Keep a set of all paths on visible tiles/bridges that spell the typed prefix (DFS from every tile with that letter). Highlight one of them (prefer the path that matches an unfound required word's canonical path).
- A typed letter that cannot extend any candidate path is ignored. Typing "RODV" on a board where V doesn't follow D leaves "ROD" selected.
- Backspace removes a letter, Enter submits, Escape clears.
- Lithuanian letters typed with the LT keyboard layout must work; see section 6 for the diacritic fallback.

While building, the header replaces "N words left" with the current word in the accent colour; the path's tiles and bridges are filled with the accent colour.

On submit, show one short message in the header for about 1.2 s, then return to the count:

| Case                                 | Message (LT)                                                                   | Colour |
| ------------------------------------ | ------------------------------------------------------------------------------ | ------ |
| Fewer than 4 letters                 | Mažiausiai 4 raidės                                                            | red    |
| Not in any word list                 | Žodžio nėra sąraše                                                             | red    |
| Required or extra word already found | Jau rastas                                                                     | orange |
| Required word found                  | Random praise, e.g. Puiku!, Šaunu!, Gerai! (only if "Feedback messages" is on) | green  |
| Extra word found                     | Papildomas žodis! −10 s                                                        | green  |

The first extra word ever found also opens a one-time dialog explaining extras: they are less common words, not needed to finish, and each takes 10 seconds off the time. Invalid submissions get a short horizontal shake of the path. Add optional haptics (`navigator.vibrate`) on mobile.

## 5. Screens and UI

The whole game is one centred column, max width about 380 px, dark by default, with nothing on screen but the toolbar, the status line and the board.

**Visual style** (match the reference's feel, not its assets)

- Background near-black (`#141414`); tiles are dark grey circles (`#2e2c29`), about 72 px on a 4×4 board with roughly 20 px gaps; letters bold, off-white, rounded sans (e.g. Baloo 2 or Nunito, which include Lithuanian glyphs).
- Bridges are thick (about 14 px) rounded bars in the tile colour, drawn under the tiles, so the tiles look strung together. Crossing diagonals draw as an X.
- One accent colour (blue `#4169e1`) for the selected path; green, orange and red for messages.
- Light mode inverts to an off-white background and light-grey tiles.
- Render the board as one SVG (bridges as lines, tiles as circles + text) so rotation, scaling and animation stay simple.

**Game screen, top to bottom**

- Toolbar: menu (☰) left; optional timer next to it; right side: Rotate, Hint (bulb with a badge showing hints left), and a reserved slot for "Remove ads".
- Status line: "Liko 14 žodžių", the current word while building, or a feedback message.
- The board.

**Hint** — 3 per puzzle. The first hint picks a target: the unfound required word with the shortest path whose tiles are all still visible (ties: random, seeded by puzzle id). Each hint reveals one more tile of that word, in order, with a soft amber fill (hint 1 shows the first letter, hint 2 the first two). The target stays until it is found; then the next hint picks a new target. Count hints used for the results screen.

**Rotate** — rotates the board 90° clockwise with a short animation. It is purely visual: logic indices stay the same, letters stay upright. Remember the rotation per puzzle.

**Timer** — counts up from 00:00. Hidden by default, toggled in settings. Pauses when the tab is hidden (`visibilitychange`) or the menu is open. Extra words subtract 10 s from the displayed and final time (never below 0).

**Pause menu** (opens from ☰, blurs the board: "Žaidimas sustabdytas" style message) with items: Kaip žaisti (how to play), Nustatymai (settings), Ankstesni galvosūkiai (past puzzles), Pasiduoti (give up, with confirm), Tęsti (resume).

**Settings** — three toggles, stored locally: Tamsi tema (dark mode, default on), Rodyti laikmatį (show timer, default off), Pagyrimo žinutės (feedback messages, default on).

**Results screen** (on solve or give up):

- Headline "Išspręsta per 02:04!" (or "Pasidavėte" on give-up) and chips: hints used; in v2, "faster than average".
- Share button: copies a short text result (puzzle date, time, hints, extras count, link) via the Web Share API, falling back to clipboard.
- Stats row: played, current daily streak, solves.
- "Šios dienos žodžiai" table: each required word (in the order found, last found first), its short definition, and the player's time at which it was found. _(decided)_ That time is the adjusted time (raw elapsed minus the extra-word bonuses earned so far), matching the timer the player saw. Missed words on give-up are shown greyed.
- "Papildomi žodžiai" list of extras found.
- Link to the archive and a "come back tomorrow" countdown to the next puzzle.

**Tutorial** — the first visit opens a 3×3 tutorial board with 2–3 short words and guided steps (drag this path, see it disappear, now type a word). Skippable, never shown again once finished or skipped.

**How to play** — a short modal restating section 2 in Lithuanian, with the "start from rare letters" tip (for LT: Č, Š, Ž, F, H, Ą, Ę, Ų).

## 6. Lithuanian language specifics

Every tile is one letter of the 32-letter Lithuanian alphabet, and letters with diacritics are distinct tiles: A and Ą are different letters.

- Alphabet: `A Ą B C Č D E Ę Ė F G H I Į Y J K L M N O P R S Š T U Ų Ū V Z Ž`. Q, W and X never appear.
- Digraphs (CH, DZ, DŽ) are two separate tiles, as in a crossword.
- Store and display uppercase. Use `toLocaleUpperCase('lt-LT')` and `toLocaleLowerCase('lt-LT')`, and normalise every input string to NFC so combining-accent input matches precomposed letters.
- Pick a font that renders all of Ą Č Ę Ė Į Š Ų Ū Ž cleanly in bold at tile size; test the dot on Ė and the ogonek on Į specifically.

**Typing with and without diacritics**

- Read `event.key`, so the Lithuanian keyboard layout (ą č ę ė į š ų ū on the number row) works directly.
- Fallback for players on English layouts: when a typed base letter has no exact path continuation, also try its diacritic variants. Map: A→Ą, C→Č, E→Ę/Ė, I→Į, S→Š, U→Ų/Ū, Z→Ž. Never map I↔Y; Y is its own letter. Exact matches always win.
- The status line always shows the real tile letters (typing "SUO" on an Š-U-O path shows "ŠUO").

**Counting words** — Lithuanian has three plural forms. For "N words left":

- `n % 10 == 1` and `n % 100 != 11` → "Liko N žodis" (1, 21, 31)
- `n % 10` in 2–9 and `n % 100` not in 11–19 → "Liko N žodžiai" (2–9, 22–29)
- otherwise → "Liko N žodžių" (10–20, 30)

Use the same helper for other counts (hints: patarimas / patarimai / patarimų; seconds; days in a streak).

**UI text** — all strings live in one `lt.json` file (a future `en.json` should be a drop-in). Dates show as "2026 m. lapkričio 5 d." via `Intl.DateTimeFormat('lt-LT')`.

## 7. Word lists

Use two lists: a small curated list of common base forms for required words, and a large list of every valid form for accepting extras. Lithuanian inflection is the main design risk: one noun has 14+ forms, so without this split boards fill with obscure endings.

| List            | Contents                                                                                                                                                                                  | Size target                                  | Used for                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `required.txt`  | Common lemmas only: nouns in nominative singular (NAMAS), verbs in the infinitive (EITI), adjectives in masculine nominative singular (GERAS), common adverbs and numerals. 4–12 letters. | 5,000–10,000 words                           | Choosing required words in the generator          |
| `valid.txt`     | Every correctly spelled Lithuanian word form, including all inflections, 4–16 letters                                                                                                     | Hundreds of thousands to a few million forms | Finding all extras on a board (generator, editor) |
| `blocklist.txt` | Vulgar, offensive, slur and sensitive words                                                                                                                                               | Hand-kept                                    | Removed from both lists                           |

Rules:

- No proper nouns, abbreviations, or words with hyphens or apostrophes.
- Required words should be words a typical adult reader knows. Rank by corpus frequency and keep the top band; let the author override per word.
- Do not ship `valid.txt` to the client: the generator stores each board's extras in the puzzle file, so the game checks submissions against required + extras only. If that ever changes, ship it as a DAWG or a gzip-compressed sorted list, lazy-loaded after the board appears.
- _(decided)_ `valid.txt` is **not committed** to git. `required.txt`, `blocklist.txt` and `LICENSES.md` are committed; `valid.txt` is gitignored and rebuilt by `build-wordlists` from a pinned version of the source dictionary, so rebuilds are reproducible.

Candidate sources (check each licence before shipping, and record it in `data/LICENSES.md`):

- The open Lithuanian spell-checking dictionary (ispell-lt / Hunspell lt_LT); expand it to all word forms with Hunspell's tools to build `valid.txt`.
- Frequency lists from a Lithuanian text corpus (e.g. the Corpus of Contemporary Lithuanian at VDU) to rank lemmas for `required.txt`.
- Lithuanian Wiktionary as a cross-check.

_(decided)_ An agent researches the licences and recommends; the author approves the choice before any list is built.

**Definitions** — each required word gets a short Lithuanian definition (under 80 characters) shown on the results screen. Write them originally: draft with an LLM, then review by hand. Do not copy definitions from published dictionaries.

## 8. Puzzle generator and authoring tool

The reference boards are hand-made; here a generator proposes boards and a small editor lets a human approve and polish them. Both share one core library (`src/core/`) with the game, so validation is identical everywhere.

**Generator** — a Node CLI: `npm run generate -- --from 2026-12-01 --days 30 --seed 42`. Deterministic for a given seed.

1. Pick an anchor word: a 9–12 letter lemma from `required.txt`, preferring ones with rarer letters. Place it as a random self-avoiding king-move path on the empty grid (randomised DFS with backtracking). Add its bridges.
2. Add words one at a time. For each candidate lemma (4–9 letters), search placements: paths whose tiles are either empty (letter gets assigned) or already hold the matching letter. Score a placement by shared tiles (reward), bridges it reuses (reward), new bridges it adds (penalty), and empty tiles it fills (reward). Take the best placement among a random sample of candidates.
3. Stop when all 16 tiles are filled and there are 10–16 required words; keep total bridges within roughly 18–26. If stuck, backtrack a few words or restart with the next seed. Never fill tiles with random letters: every tile must belong to a word.
4. Post-checks, discarding boards that fail:
   - `validatePuzzle()` passes (coverage, adjacency, paths).
   - Enumerate every simple path of 4–16 tiles on the full board, pruned by a prefix trie of `valid.txt`. Everything found that isn't required becomes the board's extras list. Reject boards where more than about 5 words from `required.txt` are traceable but not required (players would feel cheated).
   - At least one required word has 8+ letters.
   - No blocklisted word is traceable anywhere on the board.
5. Compute a difficulty score (average word length, count of 7+ letter words, letter rarity, number of extras) and store it in the file. Write `puzzles/YYYY-MM-DD.json` plus a short text report per board.

**Authoring tool** — a dev-only page (`/editor.html`, not linked from the game):

- Grid editor: click a tile and type a letter; click the gap between two tiles to toggle a bridge.
- Live word panel: every word traceable on the board, with a "required" checkbox per word; hovering a word highlights its path; picking which path is canonical when a word traces more than one way.
- Live warnings: orphan tiles and bridges outlined in red, word count, bridge count, difficulty.
- Definition field per required word.
- Buttons: Generate (runs the generator in the browser with a seed), Playtest (opens the board in the real game UI without saving progress), Export JSON, and a calendar showing which dates already have puzzles.

Target a buffer of at least 60 approved puzzles before launch. _(decided)_ The author is the only reviewer of generated puzzles and definitions; agents generate and draft, the author approves.

## 9. Daily puzzles, archive, saving

One puzzle per calendar day in the player's local time zone; all progress lives in `localStorage`, so v1 needs no server.

**Puzzle delivery**

- Static files: `puzzles/index.json` (list of dates + difficulty) and `puzzles/YYYY-MM-DD.json`.
- On load, pick today's local date; if that file is missing, show the latest available puzzle.
- Lightly obfuscate the words, paths and extras in the files (e.g. base64 + XOR with the date) so a casual look at network traffic doesn't spoil the answers. It is not security.
- _(decided, [ADR-0001](adr/0001-puzzles-obfuscated-at-rest.md))_ The repo is public, so puzzle files are **committed already obfuscated**; the game, generator, editor and tests decode in memory only. Hand-made test fixtures may stay plain. Tooling provides a way to print a decoded puzzle for review.
- A service worker caches the app shell and every puzzle already opened, so the game works offline.

**Archive** — a calendar overlay opened from the menu: month title with previous/next arrows, days that have a puzzle are tappable, future days are disabled, today is outlined, solved days are marked (filled), in-progress days get a dot. Archive puzzles play exactly like the daily one. _(decided)_ A finished (solved or given-up) puzzle opens straight to its results screen.

**Saving** (keys versioned for future migrations):

- `zt:v1:progress:<date>` — found words with the time each was found, extras, hints used, hint target, elapsed time, rotation, status, _(decided)_ and the local date the puzzle was started. Saved after every change, restored on reload.
- `zt:v1:settings` — dark mode, show timer, feedback messages, tutorial done, extra-word dialog seen.
- `zt:v1:stats` — played, solves, current streak, best streak, last daily solve date.

**Stats and streak** _(decided; refines the PDF)_:

- **Played** counts every puzzle started, daily or archive. **Solves** counts every puzzle solved, daily or archive.
- The **streak** counts only daily puzzles: a puzzle counts if it was the daily puzzle (its date equals the local date) **when it was started**, and it is solved before the next day's puzzle is played. Late-night solves past midnight therefore still count.
- A day with no published puzzle **freezes** the streak: neither extended nor broken. Playing the fallback "latest available" puzzle never counts as a daily solve.
- Archive solves don't extend the streak. Giving up the daily puzzle breaks it; giving up an archive puzzle doesn't affect it.

**Sharing** — a short plain-text result such as "Žodžių tiltai, 2026-11-05: 02:04, 2 patarimai, 2 papildomi žodžiai" plus the game URL. Never include the words themselves. _(decided)_ A given-up puzzle shares "pasiduota" in place of the time, and the URL is the plain game address, not a `#date` link.

**v2 (optional backend, out of scope for v1)** — an anonymous endpoint (e.g. a Cloudflare Worker or Supabase) that collects per-word find times. It enables the reference's "average time" column and the "faster than average" chip. Keep the client working when the endpoint is unreachable.

## 10. Tech stack and project structure

TypeScript + Vite, no game engine and no UI framework required; the board is one SVG. Keep the rules engine free of DOM code so it runs in tests, the generator CLI and the editor.

```
/src
  /core       # pure TS: alphabet, board graph, path search, visibility,
              # validatePuzzle, hint picker, plural helper
  /game       # SVG board renderer, input (pointer, tap, keyboard), state store, animations
  /ui         # toolbar, status line, menus, settings, archive calendar, results, tutorial
  /storage    # localStorage wrapper with versioned keys
  /i18n/lt.json
/tools
  generate.ts          # CLI generator (uses /src/core)
  build-wordlists.ts   # builds required.txt / valid.txt from source dictionaries
/editor                # dev-only authoring page
/data                  # required.txt, valid.txt (not committed, not shipped), blocklist.txt, LICENSES.md
/public/puzzles        # index.json + YYYY-MM-DD.json (obfuscated)
/tests                 # Vitest unit tests + Playwright end-to-end tests
```

- PWA: manifest + service worker (vite-plugin-pwa or hand-written), installable, offline after first visit.
- Deploy: GitHub Actions builds and publishes to GitHub Pages on push to main.
- Android later: wrap the same build with Capacitor (or a Trusted Web Activity). Avoid browser-only APIs without fallbacks (e.g. Web Share → clipboard).
- Ads later: keep a fixed-height banner slot below the board and a hook for an interstitial on the results screen, behind a feature flag (`ads: false` in v1). The "Remove ads" button is hidden while the flag is off. Never show an ad over the board mid-puzzle.
- Accessibility: tiles are focusable buttons with `aria-label` ("raidė Š, eilutė 2, stulpelis 3"); arrow keys move focus, Space selects; respect `prefers-reduced-motion`; colour is never the only signal (selected tiles also get a ring).
- _(decided)_ Workflow: each ticket lands as its own branch and pull request ("Closes #N"); CI (tests, lint, build) must pass, then the agent merges without waiting for human review.

## 11. Milestones and acceptance criteria

Build in five milestones; each ends with passing tests and a playable build, so problems surface before the next layer is added.

1. **Core engine** (`/src/core`) with Vitest tests:
   - `validatePuzzle` rejects orphan tiles, orphan bridges, non-adjacent bridges, paths that don't spell their word, and words under 4 letters.
   - Visibility: after finding a word, a shared tile stays while any unfound word uses it; it disappears with the last one.
   - Typing search: on a board where V is not bridged after D, typing R-O-D-V leaves "ROD" selected; diacritic fallback picks Š for typed S only when no plain S continues the path.
   - Plural helper returns žodis for 1 and 21, žodžiai for 2 and 22, žodžių for 10, 11 and 15.
   - Hint picker: hint 1 reveals one tile, hint 2 two tiles of the same word, max 3 per puzzle.
2. **Playable board** with 3 hand-made test puzzles: drag, tap and typing all work on a phone and on desktop; messages from section 4; solve leads to the results screen.
3. **Word lists + generator + editor**: `build-wordlists` produces the lists; `generate` produces 30 valid boards for a seed in under 2 minutes; every generated board passes `validatePuzzle` and the post-checks; the editor can load, edit, playtest and export a board.
4. **Full game loop**: daily selection, archive calendar, saving and restoring mid-puzzle, stats and streak, settings, tutorial, share, timer with pause and the −10 s extra-word bonus.
5. **Release**: PWA offline mode, GitHub Pages deploy, Lighthouse score 90+ on mobile, Playwright test that solves a fixture puzzle by typing and by dragging, 60 approved puzzles scheduled.

**Open questions for the author** (each becomes a `ready-for-human` ticket):

- Final game name and domain. Decide before launch: the `zt:` storage prefix is permanent once players have saved data.
- Which dictionary sources pass the licence check (an agent researches and recommends first).
- Ad network and whether "Remove ads" is a paid unlock (affects the Android wrapper): deferred past v1.

## 12. Decisions log

Settled in the grilling session on 2026-11-05:

| #   | Decision                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Vocabulary: Puzzle (whole day's content) vs Board (tiles + bridges) vs Submission (a committed path before judgement). See `GLOSSARY.md`.                    |
| D2  | Puzzle files are committed already obfuscated, because the repo is public ([ADR-0001](adr/0001-puzzles-obfuscated-at-rest.md)).                              |
| D3  | The streak counts only a puzzle that was the daily puzzle when started; a day with no published puzzle freezes the streak; the fallback puzzle never counts. |
| D4  | Late-night solves count: started on its day and solved before the next daily puzzle is played.                                                               |
| D5  | Per-word times on the results screen are adjusted for extra-word bonuses.                                                                                    |
| D6  | Played and Solves count daily and archive puzzles; the streak is daily-only; giving up an archive puzzle doesn't touch the streak.                           |
| D7  | Finished puzzles reopen to their results screen; no replay in v1.                                                                                            |
| D8  | `valid.txt` is gitignored and rebuilt from a pinned source; the small lists are committed.                                                                   |
| D9  | The author is the sole reviewer of generated puzzles and definitions; agents research, generate and draft. 60 approved puzzles before launch.                |
| D10 | "Žodžių tiltai" stays the working title; renaming is one later ticket, decided before launch.                                                                |
| D11 | One branch + PR per ticket; CI must pass; the agent merges.                                                                                                  |
| D12 | All five milestones are ticketed up front.                                                                                                                   |
