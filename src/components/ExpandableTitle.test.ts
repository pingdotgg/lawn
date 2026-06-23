import assert from "node:assert/strict";
import test from "node:test";
import { isTitleOverflowing } from "./ExpandableTitle";

test("only enables expansion when the rendered title is actually clamped", () => {
  const text = { scrollWidth: 200 };
  assert.equal(isTitleOverflowing({ clientWidth: 220 }, text), false);
  assert.equal(isTitleOverflowing({ clientWidth: 120 }, text), true);
});
