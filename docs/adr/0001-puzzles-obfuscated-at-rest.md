# Puzzle files are committed already obfuscated

The repository is public and puzzles are scheduled weeks ahead, so plain puzzle JSON in git would publish every future answer. We commit puzzle files in their obfuscated form (base64 + XOR keyed by the puzzle date) and decode only in memory in the game, generator, editor and tests; hand-made test fixtures may stay plain. This is spoiler protection, not security: anyone determined can decode them.

## Considered Options

- **Private puzzle repo pulled in at build time**: real secrecy, but more setup (second repo, deploy key, CI wiring). Revisit if spoilers become a real problem.
- **Make this repo private**: GitHub Pages from a private repo needs a paid plan.
- **Plain JSON, accept spoilers**: simplest, but anyone browsing the repo sees tomorrow's words.

## Consequences

Puzzle diffs are unreadable in git, so tooling needs a way to print a decoded puzzle.
