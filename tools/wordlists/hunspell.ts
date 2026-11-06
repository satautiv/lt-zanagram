// A minimal Hunspell expander: enough for ispell-lt's lt_LT, which uses only single-character
// flags and plain PFX/SFX rules (no continuation flags, no compounding). See
// docs/research/word-sources.md.

export interface AffixRule {
  strip: string;
  add: string;
  condition: RegExp;
}

export interface AffixGroup {
  kind: 'PFX' | 'SFX';
  /** Cross product: may combine with an affix of the other kind. */
  cross: boolean;
  rules: AffixRule[];
}

export type Affixes = ReadonlyMap<string, AffixGroup>;

export interface DicEntry {
  word: string;
  flags: string;
}

/** Reads the PFX/SFX groups of an .aff file. */
export function parseAff(text: string): Affixes {
  const groups = new Map<string, AffixGroup>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const [kind, flag, a, b, c] = line.split(/\s+/);
    if ((kind !== 'PFX' && kind !== 'SFX') || flag === undefined) continue;
    const group = groups.get(flag);
    if (!group) {
      // Header: "SFX flag Y count".
      groups.set(flag, { kind, cross: a === 'Y', rules: [] });
      continue;
    }
    if (a === undefined || b === undefined) throw new Error(`Bad affix line: ${raw}`);
    if (b.includes('/')) throw new Error(`Continuation flags are not supported: ${raw}`);
    const cond = c ?? '.';
    group.rules.push({
      strip: a === '0' ? '' : a,
      add: b === '0' ? '' : b,
      condition: new RegExp(kind === 'SFX' ? `${cond}$` : `^${cond}`, 'u'),
    });
  }
  return groups;
}

/** Reads a .dic file: the first line is the entry count, then `word/FLAGS` per line. */
export function parseDic(text: string): DicEntry[] {
  return text
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const slash = line.indexOf('/');
      return slash === -1
        ? { word: line.trim(), flags: '' }
        : { word: line.slice(0, slash), flags: line.slice(slash + 1).trim() };
    });
}

function applySuffix(word: string, rule: AffixRule): string | null {
  if (!rule.condition.test(word) || !word.endsWith(rule.strip)) return null;
  return word.slice(0, word.length - rule.strip.length) + rule.add;
}

function applyPrefix(word: string, rule: AffixRule): string | null {
  if (!rule.condition.test(word) || !word.startsWith(rule.strip)) return null;
  return rule.add + word.slice(rule.strip.length);
}

/** Every form of a dictionary entry: the word itself, its affixed forms and cross products. */
export function expand(entry: DicEntry, affixes: Affixes): string[] {
  const groups = [...entry.flags].flatMap((flag) => affixes.get(flag) ?? []);
  const suffixes = groups.filter((g) => g.kind === 'SFX');
  const prefixes = groups.filter((g) => g.kind === 'PFX');

  const forms = [entry.word];
  const crossSuffixed: string[] = [entry.word];
  for (const group of suffixes) {
    for (const rule of group.rules) {
      const form = applySuffix(entry.word, rule);
      if (form === null) continue;
      forms.push(form);
      if (group.cross) crossSuffixed.push(form);
    }
  }
  for (const group of prefixes) {
    for (const rule of group.rules) {
      // Prefix conditions are checked against the root, as Hunspell does.
      if (applyPrefix(entry.word, rule) === null) continue;
      const bases = group.cross ? crossSuffixed : [entry.word];
      for (const base of bases) forms.push(rule.add + base.slice(rule.strip.length));
    }
  }
  return forms;
}
