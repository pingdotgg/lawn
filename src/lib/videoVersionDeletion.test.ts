import assert from "node:assert/strict";
import test from "node:test";
import type { Id } from "@convex/_generated/dataModel";
import { findPreferredReplacementVideoId } from "./videoVersionDeletion";

const v1 = "video-v1" as Id<"videos">;
const v2 = "video-v2" as Id<"videos">;
const v3 = "video-v3" as Id<"videos">;

test("prefers the newer survivor for a middle version", () => {
  assert.equal(findPreferredReplacementVideoId([{ _id: v3 }, { _id: v2 }, { _id: v1 }], v2), v3);
});

test("falls back to the older survivor for the latest version", () => {
  assert.equal(findPreferredReplacementVideoId([{ _id: v3 }, { _id: v2 }, { _id: v1 }], v3), v2);
});

test("returns null when no version survives", () => {
  assert.equal(findPreferredReplacementVideoId([{ _id: v1 }], v1), null);
});
