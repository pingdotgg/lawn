import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_VIDEO_FILE_SIZE_BYTES,
  MEBIBYTE as SERVER_MEBIBYTE,
  SINGLE_PUT_MAX_BYTES as SERVER_SINGLE_PUT_MAX_BYTES,
  assertVideoFileSizeAllowed,
  usesMultipartUpload,
} from "@convex/uploadLimits";
import {
  MEBIBYTE as CLIENT_MEBIBYTE,
  SINGLE_PUT_MAX_BYTES as CLIENT_SINGLE_PUT_MAX_BYTES,
  isFileTooLarge,
} from "@/lib/uploadLimits";

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

test("client and server switch to multipart above 256 MiB", () => {
  const threshold = 256 * SERVER_MEBIBYTE;

  assert.equal(CLIENT_MEBIBYTE, SERVER_MEBIBYTE);
  assert.equal(CLIENT_SINGLE_PUT_MAX_BYTES, threshold);
  assert.equal(SERVER_SINGLE_PUT_MAX_BYTES, threshold);
  assert.equal(usesMultipartUpload(threshold), false);
  assert.equal(usesMultipartUpload(threshold + 1), true);
});
