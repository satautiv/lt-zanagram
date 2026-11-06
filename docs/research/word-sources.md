# Word sources for the Lithuanian word lists

Research for ticket #26 (spec §7). Checked 2026-11-05. The approval decision is ticket #27.

## Recommendation

| List            | Source                                                                                  | Licence                 | How                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `valid.txt`     | ispell-lt **myspell-lt 1.3.2** (Hunspell `lt_LT`) **∩** VDU **CCLL wordform list 2022** | BSD-3-Clause; CC BY 4.0 | Expand every lowercase Hunspell stem with its affix rules, keep forms of 4–16 letters that also occur **≥ 2 times** in the corpus |
| `required.txt`  | Hunspell stems **∩** VDU **CCLL Lemmatised Frequency Lists** (2025)                     | BSD-3-Clause; CC BY 4.0 | Keep stems that the lemmatised list confirms as lemmas, rank by lemma frequency, keep the top band (spec target 5,000–10,000)     |
| `blocklist.txt` | Hand-kept                                                                               | ours                    | Seeded by an agent, reviewed by the author                                                                                        |
| Wiktionary      | Manual cross-check only                                                                 | CC BY-SA                | Never copied into our data, so no licence obligations                                                                             |

All three downloads are public, need no login, and can be pinned by URL + SHA-256 for reproducible rebuilds (decision D8).

## Why the corpus intersection for `valid.txt`

Fully expanding the Hunspell dictionary produces far more than the spec's "hundreds of thousands to a few million" forms:

| Measure (prototype run)                                    | Count       | Plain-text size |
| ---------------------------------------------------------- | ----------- | --------------- |
| Hunspell entries                                           | 85,792      |                 |
| Lowercase stems (proper nouns and abbreviations dropped)   | 63,378      |                 |
| All expanded forms, 4–16 letters, Lithuanian alphabet only | 24,315,641  | ~370 MB         |
| … that occur in the corpus at least once                   | 758,101     | 9.0 MB          |
| … at least twice                                           | **533,001** | **6.2 MB**      |
| … at least 3 times                                         | 437,395     | 5.0 MB          |
| … at least 5 times                                         | 344,618     | 3.9 MB          |

24 million forms are mostly mechanically valid but never-used combinations (every prefix × reflexive × participle). They are too big for the generator's prefix trie and would make extras lists full of forms nobody writes. Requiring corpus attestation keeps forms people actually use; the threshold (≥ 2 removes one-off typos and OCR noise) is a single tunable number in `build-wordlists`. Spot checks: NAMAS, NAMŲ, NAMAMS, EITI, EINU, GERAS, GERŲJŲ all survive.

The Hunspell affix file uses only plain `SFX`/`PFX` rules (2,696 suffix and 90 prefix lines, 42 of 44 groups cross-product, no continuation flags, no compounding), so expansion needs no native Hunspell tools: a ~60-line expander in `tools/` is enough, and it runs on any machine and in CI.

## Why the lemmatised list for `required.txt`

Ranking Hunspell stems by the summed corpus frequency of their forms works, but the stems include some standalone inflected forms (pronoun and irregular verb forms such as _turi_, _viso_, _juos_, _kurios_), which must not be required words. The CCLL lemmatised list comes from a real lemmatiser, so intersecting with it keeps only true base forms (nominative singular nouns, infinitives, masculine nominative adjectives) as the spec requires. Prototype sample of the ranked stems at rank ~5,000: _chirurgija, auklėtojas, nelauktas, gelsvas, aplankas, galaktika_. That is about the right "typical adult knows it" level for the bottom of the band.

## Sources

### ispell-lt (Hunspell `lt_LT`)

- Repository: <https://github.com/ispell-lt/ispell-lt> (maintained; last push 2025-12)
- Pinned release: `rel-1.3.2` (2020-06-21), asset `myspell-lt-1.3.2.zip`
  - URL: <https://github.com/ispell-lt/ispell-lt/releases/download/rel-1.3.2/myspell-lt-1.3.2.zip>
  - SHA-256: `c1b4b5604143b480bf7890470db7f5e38c668053ee4d5b84383fa8c987921f82`
- Licence: **BSD-3-Clause**, © 2000–2020 Albertas Agejevas and contributors. Allows redistribution and modification, including commercial use, provided the copyright notice and licence text are kept with redistributions. We don't redistribute the dictionary itself (`valid.txt` is gitignored and never shipped); derived word lists in puzzle files and `required.txt` still carry the notice in `data/LICENSES.md` to be safe.
- Also packaged on npm as `dictionary-lt` 2.0.0 (BSD-3-Clause, same source). The GitHub release is preferred because it is the upstream artifact.

### VDU Corpus of Contemporary Lithuanian: wordform list

- "Wordlist of the Contemporary Corpus of Lithuanian language", Vytautas Magnus University, CLARIN-LT: <https://hdl.handle.net/20.500.11821/8>
- 123.45 million-word corpus; 1,733,157 distinct wordforms with frequencies (the item page says 1,850,477 entries across all sub-corpus files).
- Pinned file: `CCLL-Wordlists-2022.zip` (33 MB)
  - URL: <https://clarin-repo.lt/bitstream/handle/20.500.11821/8/CCLL-Wordlists-2022.zip>
  - SHA-256: `a7fc944ab4355a8288e56138bd15a627889d47269ee3cbc64fec21e6f102121b`
  - We use `byalphabet-2022/freq-visas-abc.txt` (`wordform count` per line, lowercase).
- Licence: the repository page lists **CC BY 4.0**; the readme inside the zip says **CLARIN-LT PUB**. Both are public licences that allow reuse, modification and redistribution with attribution. The repository's legal page says the licence attached to the item governs downloaded data. See the risk note below.
- Attribution requested by the readme: Rimkutė E., Kovalevskaitė J., Melninkaitė V., Utka A., Vitkutė-Adžgauskienė D. 2010: _Corpus of Contemporary Lithuanian Language – the Standardised Way_. Proceedings of HLT – The Baltic Perspective, 154–160.

### VDU CCLL Lemmatised Frequency Lists

- Petkevičius, Mindaugas. 2025. _CCLL Lemmatised Frequency Lists_. SITTI, Vytautas Magnus University. CLARIN-LT: <https://hdl.handle.net/20.500.11821/77>
- 15.18 million tokens; six lists including alphabetic **lemma** frequencies. One 102 MB zip, public, no login.
- Licence: **CC BY 4.0** (repository page).
- Pinned file: `LT_freq_lists.zip` (102 MB), of which `4-LT_lemma_alpha_freq_list.txt` (`lemma<TAB>count`, proper nouns capitalised) is used
  - URL: <https://clarin-repo.lt/bitstream/handle/20.500.11821/77/LT_freq_lists.zip>
  - SHA-256: `74cee83b6d8c286856d0d7b20ef6a5e617785948abe71e49de268f8c55f19330`

## Correction found while building (2026-11-06)

The CCLL 2022 wordform list has almost no forms with **Ž**: its build script (readme step 1) ran `grep -v '[^a-z]'`, which dropped them, and the few left have Ž turned into Ū (`ūmogus 38`, no `žmogus`). The first `valid.txt` therefore had no Ž words, and no Ž lemma could be required. `build-wordlists` now also reads the 2025 package's `3-LT_alpha_wordform_freq_list.txt` (same approved source and licence) and accepts a form seen ≥ 2 times in either list (counts are not summed across lists). Result: 614,809 forms, 60,207 of them with Ž.

## Risks and open points

1. **Licence wording mismatch on the wordform list** (CC BY 4.0 on the page, CLARIN-LT PUB in the readme). Both need attribution only, and the default PUB licence has no non-commercial condition, so the ads planned for later are fine under either reading. CLARIN-LT's general terms mention non-commercial use of _the repository service_, not of downloaded items. If you want certainty before showing ads, a one-line email to CLARIN-LT (clarin-lt.lt) asking which licence applies would settle it. It isn't needed before building.
2. **Attribution must be visible to players**, not only in the repo: CC BY needs credit where the derived work is used. Recommendation: a short "Šaltiniai" (sources) line in the How to play modal or a footer link to `LICENSES.md`. That is a small add-on to ticket #24 (tutorial and how-to-play).
3. **Hunspell release age**: 1.3.2 is from 2020. The repo is still maintained; a newer build from `master` could be pinned to a commit instead if it turns out to have notably better coverage. Not worth the extra build step for v1.
4. Word forms themselves are generally not copyrightable, but we treat every list as licensed anyway and keep the notices.
