# Žodžių tiltai

A daily Lithuanian word-bridge puzzle (working title). Spec: [`docs/spec.md`](docs/spec.md) · Vocabulary: [`GLOSSARY.md`](GLOSSARY.md) · Plan: [issue #1](https://github.com/satautiv/lt-zanagram/issues/1).

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
```
