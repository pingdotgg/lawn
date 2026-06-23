import test from "node:test";
import assert from "node:assert/strict";
import { MAX_VIDEO_FILE_SIZE_BYTES, assertVideoFileSizeAllowed } from "@convex/uploadLimits";
import { isFileTooLarge } from "@/lib/uploadLimits";

test("all teams can upload videos up to 50 GiB", () => {
  assert.equal(isFileTooLarge(MAX_VIDEO_FILE_SIZE_BYTES), false);
  assert.doesNotThrow(() => assertVideoFileSizeAllowed(MAX_VIDEO_FILE_SIZE_BYTES));
});

test("videos larger than 50 GiB are rejected", () => {
  assert.equal(isFileTooLarge(MAX_VIDEO_FILE_SIZE_BYTES + 1), true);
  assert.throws(
    () => assertVideoFileSizeAllowed(MAX_VIDEO_FILE_SIZE_BYTES + 1),
    /Maximum size is 50 GiB/,
  );
});
