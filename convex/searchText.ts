// Text normalization shared by the search index (convex/searchEntries.ts), the
// search query (convex/search.ts) and the command palette's client-side matching.
//
// Convex full text search lowercases and splits on non-alphanumerics, only
// prefix-matches the LAST query term, and has no typo tolerance. To make
// palette search forgiving we index extra tokens: camelCase / letter-digit
// subwords and every word prefix, so each query word behaves like a prefix.

const MAX_TERM_LENGTH = 32; // Convex silently drops longer terms
const MAX_QUERY_TERMS = 16;
const MIN_PREFIX_LENGTH = 2;
const SUBWORD_BOUNDARY =
  /(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/gu;

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "");
const words = (text: string) =>
  fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

// "FinalCut_v2.mp4" -> ["finalcut", "final", "cut", "v2", "v", "2", "mp4", "mp", "4"]
export function tokenize(text: string) {
  const tokens = words(text).flatMap((word) => {
    const parts = word.replace(SUBWORD_BOUNDARY, " ").split(" ");
    return parts.length > 1 ? [word, ...parts] : [word];
  });
  return [...new Set(tokens.map((token) => token.toLowerCase().slice(0, MAX_TERM_LENGTH)))];
}

export function buildSearchText(title: string) {
  const tokens = tokenize(title);
  const prefixes = tokens.flatMap((token) =>
    Array.from({ length: Math.max(0, token.length - MIN_PREFIX_LENGTH) }, (_, i) =>
      token.slice(0, MIN_PREFIX_LENGTH + i),
    ),
  );
  return [...new Set([...tokens, ...prefixes])].join(" ");
}

export function queryWords(query: string) {
  return words(query)
    .map((word) => word.toLowerCase().slice(0, MAX_TERM_LENGTH))
    .slice(0, MAX_QUERY_TERMS);
}

// Lower is better: 0 exact, 1 starts with the query, 2 every query word starts
// a title word, 3 some query words match, 4 nothing matches.
export function matchRank(title: string, query: string[]) {
  if (query.length === 0) return 4;
  const phrase = query.join(" ");
  const folded = words(title).join(" ").toLowerCase();
  if (folded === phrase) return 0;
  if (folded.startsWith(phrase)) return 1;
  const tokens = tokenize(title);
  const hits = query.filter((word) => tokens.some((token) => token.startsWith(word))).length;
  if (hits === query.length) return 2;
  return hits > 0 ? 3 : 4;
}

const isLetter = (char: string | undefined) => !!char && /\p{L}/u.test(char);
const isAlphanumeric = (char: string | undefined) => !!char && /[\p{L}\p{N}]/u.test(char);
const isLower = (char: string | undefined) => !!char && /\p{Ll}/u.test(char);
const isUpper = (char: string | undefined) => !!char && /\p{Lu}/u.test(char);

// Offsets where a word or subword starts, using the same boundaries as tokenize.
function wordStarts(text: string) {
  return Array.from({ length: text.length }, (_, i) => i).filter((i) => {
    const [prev, char, next] = [text[i - 1], text[i], text[i + 1]];
    if (!isAlphanumeric(char)) return false;
    return (
      !isAlphanumeric(prev) ||
      (isLower(prev) && isUpper(char)) ||
      (isUpper(prev) && isUpper(char) && isLower(next)) ||
      isLetter(prev) !== isLetter(char)
    );
  });
}

// [start, end) ranges of `text` that query words prefix, for highlighting.
export function highlightRanges(text: string, query: string[]) {
  // Fold accents per code point, remembering which original offset each folded
  // unit came from so ranges point back into the original title.
  const codePoints = Array.from(text);
  const offsets = codePoints.map((_, i) =>
    codePoints.slice(0, i).reduce((total, char) => total + char.length, 0),
  );
  const units = codePoints.flatMap((char, i) =>
    fold(char)
      .split("")
      .map((unit) => {
        const lower = unit.toLowerCase();
        return { unit, lower: lower.length === 1 ? lower : unit, offset: offsets[i] };
      }),
  );
  const folded = units.map(({ unit }) => unit).join("");
  const lower = units.map(({ lower }) => lower).join("");

  const ranges: Array<[number, number]> = [];
  for (const start of wordStarts(folded)) {
    const begin = units[start].offset;
    if (begin < (ranges.at(-1)?.[1] ?? 0)) continue;
    const longest = query
      .filter((word) => lower.startsWith(word, start))
      .reduce((best, word) => (word.length > best.length ? word : best), "");
    if (!longest) continue;
    // End at the next folded unit so trailing combining marks stay highlighted.
    const end = units[start + longest.length]?.offset ?? text.length;
    ranges.push([begin, Math.max(end, units[start + longest.length - 1].offset + 1)]);
  }
  return ranges;
}
