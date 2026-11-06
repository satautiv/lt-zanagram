# lt-zanagram

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on satautiv/lt-zanagram (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Project

Spec: `docs/spec.md` (source of truth; supersedes the PDF). Use the vocabulary in `GLOSSARY.md`.

Commands: `npm test` (Vitest), `npm run e2e` (Playwright), `npm run lint`, `npm run typecheck`, `npm run build`. Run all of them before opening a PR; CI runs the same.

`src/core` must stay DOM-free: it is type-checked without the DOM lib (`tsconfig.core.json`) and ESLint blocks browser globals there.

`src/sw` is the service worker, type-checked with the WebWorker lib (`tsconfig.sw.json`); `tools/service-worker-plugin.ts` builds it to `sw.js` with the precache list. E2E tests block service workers unless they opt in (`offline.spec.ts`).

Workflow: one branch + PR per ticket, body says `Closes #N`; merge once CI passes.
