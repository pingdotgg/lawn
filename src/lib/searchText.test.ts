import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchText,
  highlightRanges,
  matchRank,
  queryWords,
  tokenize,
} from "@convex/searchText";

const indexed = (title: string) => new Set(buildSearchText(title).split(" "));

test("tokenize splits separators, camelCase and letter-digit boundaries", () => {
  assert.deepEqual(tokenize("FinalCut_v2.mp4"), [
    "finalcut",
    "final",
    "cut",
    "v2",
    "v",
    "2",
    "mp4",
    "mp",
    "4",
  ]);
  assert.deepEqual(tokenize("HTMLFile"), ["htmlfile", "html", "file"]);
});

test("tokenize folds accents", () => {
  assert.deepEqual(tokenize("Café Crème"), ["cafe", "creme"]);
});

test("tokenize truncates terms longer than Convex allows", () => {
  const [token] = tokenize("a".repeat(40));
  assert.equal(token.length, 32);
});

test("search text indexes word prefixes so every query word can be partial", () => {
  const tokens = indexed("FinalCut_v2.mp4");
  for (const word of ["fi", "fin", "fina", "final", "cut", "cu", "v2", "mp4", "finalcut"]) {
    assert.ok(tokens.has(word), `expected ${word}`);
  }
  assert.ok(!tokens.has("f"));
});

test("search text keeps CJK runs searchable from the start", () => {
  assert.ok(indexed("東京タワー").has("東京"));
});

test("queryWords folds and caps terms", () => {
  assert.deepEqual(queryWords("  Fin  CU! "), ["fin", "cu"]);
  assert.equal(queryWords(Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ")).length, 16);
});

test("matchRank orders exact, starts-with, all-words and partial matches", () => {
  assert.equal(matchRank("Final cut", queryWords("final cut")), 0);
  assert.equal(matchRank("Final cut v2", queryWords("final cut")), 1);
  assert.equal(matchRank("FinalCut_v2.mp4", queryWords("fin cu")), 2);
  assert.equal(matchRank("Final edit", queryWords("final cut")), 3);
  assert.equal(matchRank("Rough edit", queryWords("final")), 4);
  assert.equal(matchRank("Café", queryWords("cafe")), 0);
});

test("highlightRanges marks word, camelCase and accent-folded prefixes", () => {
  assert.deepEqual(highlightRanges("FinalCut_v2.mp4", ["fin", "cu"]), [
    [0, 3],
    [5, 7],
  ]);
  assert.deepEqual(highlightRanges("Director's cut", ["cut"]), [[11, 14]]);
  assert.deepEqual(highlightRanges("Café interview", ["cafe"]), [[0, 4]]);
  assert.deepEqual(highlightRanges("nai\u0308ve take", ["naive", "ta"]), [
    [0, 6],
    [7, 9],
  ]);
  assert.deepEqual(highlightRanges("nai\u0308ve", ["nai"]), [[0, 4]]);
  assert.deepEqual(highlightRanges("Rough edit", ["cut"]), []);
});
