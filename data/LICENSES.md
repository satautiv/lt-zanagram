# Word list sources and licences

Status: **approved** by the author in ticket #27 (2026-11-06). Research and measurements: [`docs/research/word-sources.md`](../docs/research/word-sources.md). The lists are built by `npm run wordlists` (`tools/build-wordlists.ts`), which pins each download by URL and SHA-256.

| File                                    | Built from                                                                           | Licence                 |
| --------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| `valid.txt` (gitignored, never shipped) | ispell-lt myspell-lt 1.3.2 ∩ (VDU CCLL wordform list 2022 ∪ CCLL 2025 wordform list) | BSD-3-Clause; CC BY 4.0 |
| `required.txt`                          | ispell-lt myspell-lt 1.3.2 ∩ VDU CCLL Lemmatised Frequency Lists 2025                | BSD-3-Clause; CC BY 4.0 |
| `blocklist.txt`                         | Hand-kept by the project                                                             | Project's own           |
| `required-overrides.txt`                | Hand-kept by the project                                                             | Project's own           |

Extra-word lists inside puzzle files are derived from `valid.txt` and carry the same attributions.

## ispell-lt (Hunspell lt_LT)

<https://github.com/ispell-lt/ispell-lt>, release `rel-1.3.2`, file `myspell-lt-1.3.2.zip`.

```
Copyright (c) 2000-2020, Albertas Agejevas and contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:
1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holders nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY COPYRIGHT HOLDERS AND CONTRIBUTORS ``AS IS'' AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED.  IN NO EVENT SHALL ALBERTAS AGEJEVAS OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
SUCH DAMAGE.
```

## Corpus of Contemporary Lithuanian Language: wordform list

Utka, Andrius. 2016. _Wordlist of the Contemporary Corpus of Lithuanian language_. Vytautas Magnus University. CLARIN-LT, <https://hdl.handle.net/20.500.11821/8>. File `CCLL-Wordlists-2022.zip`.

Licence: Creative Commons Attribution 4.0 (CC BY 4.0), <https://creativecommons.org/licenses/by/4.0/> (the readme inside the archive names CLARIN-LT PUB; both require attribution). Used to filter word forms by corpus frequency; modified (intersected and filtered), not redistributed as is.

Reference requested by the authors: Rimkutė E., Kovalevskaitė J., Melninkaitė V., Utka A., Vitkutė-Adžgauskienė D. 2010. _Corpus of Contemporary Lithuanian Language – the Standardised Way_. Proceedings of the Fourth International Conference Human Language Technologies – The Baltic Perspective, 154–160.

## CCLL Lemmatised Frequency Lists

Petkevičius, Mindaugas. 2025. _CCLL Lemmatised Frequency Lists_. Institute of Digital Resources and Interdisciplinary Research (SITTI), Vytautas Magnus University. CLARIN-LT, <https://hdl.handle.net/20.500.11821/77>.

File `LT_freq_lists.zip`, of which `4-LT_lemma_alpha_freq_list.txt` (lemmas) and `3-LT_alpha_wordform_freq_list.txt` (word forms, for `valid.txt`) are used.

Licence: Creative Commons Attribution 4.0 (CC BY 4.0), <https://creativecommons.org/licenses/by/4.0/>. Used to confirm lemmas and rank them by frequency; modified, not redistributed as is.
