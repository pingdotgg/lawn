import test from "node:test";
import assert from "node:assert/strict";
import {
  collectUniqueTags,
  commentMatchesTagFilter,
  exclusiveSelectTag,
  isTagActive,
  toggleTagFilter,
} from "./commentTags";

test("collectUniqueTags dedupes case-insensitively and preserves first casing", () => {
  assert.deepEqual(
    collectUniqueTags([
      { tags: ["In-Out", "Audio"] },
      { tags: ["in-out", "Color"] },
      { tags: undefined },
    ]),
    ["In-Out", "Audio", "Color"],
  );
});

test("exclusiveSelectTag leaves only the clicked tag active", () => {
  const next = exclusiveSelectTag(null, "Audio");
  assert.deepEqual(next, new Set(["Audio"]));
  assert.equal(isTagActive(next, "Audio"), true);
  assert.equal(isTagActive(next, "Color"), false);
});

test("toggleTagFilter right-click from all-active turns that tag off", () => {
  const all = ["In-Out", "Audio", "Color"];
  const next = toggleTagFilter(null, "Audio", all);
  assert.equal(isTagActive(next, "In-Out"), true);
  assert.equal(isTagActive(next, "Audio"), false);
  assert.equal(isTagActive(next, "Color"), true);
});

test("toggleTagFilter right-click re-enables a previously off tag", () => {
  const all = ["In-Out", "Audio", "Color"];
  const partial = new Set(["In-Out", "Color"]);
  const next = toggleTagFilter(partial, "Audio", all);
  // All tags active again → collapsed to null
  assert.equal(next, null);
});

test("toggleTagFilter toggling the last active tag leaves an empty set", () => {
  const all = ["In-Out", "Audio", "Color"];
  const only = new Set(["Audio"]);
  const next = toggleTagFilter(only, "Audio", all);
  assert.deepEqual(next, new Set());
});

test("commentMatchesTagFilter null shows everything including untagged", () => {
  assert.equal(commentMatchesTagFilter({ tags: ["Audio"] }, null), true);
  assert.equal(commentMatchesTagFilter({ tags: [] }, null), true);
  assert.equal(commentMatchesTagFilter({}, null), true);
});

test("commentMatchesTagFilter subset requires at least one matching tag", () => {
  const filter = new Set(["Audio"]);
  assert.equal(commentMatchesTagFilter({ tags: ["Audio", "Color"] }, filter), true);
  assert.equal(commentMatchesTagFilter({ tags: ["Color"] }, filter), false);
  assert.equal(commentMatchesTagFilter({ tags: [] }, filter), false);
});

test("commentMatchesTagFilter empty filter shows nothing", () => {
  assert.equal(commentMatchesTagFilter({ tags: ["Audio"] }, new Set()), false);
});
