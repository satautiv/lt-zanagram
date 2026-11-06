# Žodžių tiltai

A daily Lithuanian word-bridge puzzle (working title). Play: <https://satautiv.github.io/lt-zanagram/>. Spec: [`docs/spec.md`](docs/spec.md) · Vocabulary: [`GLOSSARY.md`](GLOSSARY.md) · Plan: [issue #1](https://github.com/satautiv/lt-zanagram/issues/1).

## Development

Requires Node 22.

```sh
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev        # local dev server
npm test           # Vitest unit tests
npm run e2e        # Playwright end-to-end tests (builds and serves the app)
npm run lint       # ESLint + Prettier check (npm run format to fix)
npm run typecheck  # app + DOM-free core
npm run build      # production build into dist/
npm run lighthouse # Lighthouse CI: mobile 90+ (needs Chrome)
npm run wordlists  # rebuild data/required.txt and data/valid.txt from the pinned sources
npm run generate -- --from 2026-12-01 --days 30 --seed 42   # propose puzzles (needs wordlists)
npm run puzzle:show -- 2026-12-01                            # print a decoded puzzle
npm run dev        # then open http://localhost:5173/lt-zanagram/editor.html: the puzzle editor (dev only)
```
