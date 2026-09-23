import assert from "node:assert/strict";
import test from "node:test";
import {
  chunk,
  clickSelection,
  pruneSelection,
  selectRange,
  toggleSelection,
} from "./videoSelection";

const ids = ["a", "b", "c", "d", "e", "f"];
const sorted = (set: ReadonlySet<string>) => [...set].sort();

test("toggleSelection adds and removes an id", () => {
  const added = toggleSelection(new Set<string>(), "a");
  assert.deepEqual([...added], ["a"]);
  assert.deepEqual([...toggleSelection(added, "a")], []);
});

test("selectRange selects everything between anchor and target in either direction", () => {
  assert.deepEqual(sorted(selectRange(ids, "b", "e", new Set(["b"]))), ["b", "c", "d", "e"]);
  assert.deepEqual(sorted(selectRange(ids, "e", "b", new Set(["e"]))), ["b", "c", "d", "e"]);
});

test("selectRange keeps existing selections outside the range", () => {
  assert.deepEqual(sorted(selectRange(ids, "c", "d", new Set(["a", "c"]))), ["a", "c", "d"]);
});

test("selectRange adds only the target when the anchor is missing", () => {
  assert.deepEqual([...selectRange(ids, "z", "d", new Set<string>())], ["d"]);
  assert.deepEqual([...selectRange(ids, null, "d", new Set<string>())], ["d"]);
});

test("clickSelection toggles without shift and moves the anchor", () => {
  const next = clickSelection(ids, { selected: new Set(["a"]), anchor: "a" }, "c", false);
  assert.deepEqual(sorted(next.selected), ["a", "c"]);
  assert.equal(next.anchor, "c");
});

test("clickSelection extends a range with shift", () => {
  const next = clickSelection(ids, { selected: new Set(["a"]), anchor: "a" }, "f", true);
  assert.deepEqual(sorted(next.selected), ids);
  assert.equal(next.anchor, "f");
});

test("clickSelection toggles on shift-click without a usable anchor", () => {
  assert.deepEqual(
    [...clickSelection(ids, { selected: new Set<string>(), anchor: null }, "c", true).selected],
    ["c"],
  );
  assert.deepEqual(
    [...clickSelection(ids, { selected: new Set(["c"]), anchor: "c" }, "c", true).selected],
    [],
  );
});

test("pruneSelection drops missing ids and preserves identity when unchanged", () => {
  const selected = new Set(["a", "b"]);
  assert.equal(pruneSelection(selected, new Set(ids)), selected);
  assert.deepEqual([...pruneSelection(selected, new Set(["b"]))], ["b"]);
});

test("chunk splits into fixed-size chunks", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 2), []);
});
