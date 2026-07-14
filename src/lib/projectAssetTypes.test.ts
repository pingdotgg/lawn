import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyProjectAssetKind,
  isAllowedProjectAsset,
  isVideoUploadFile,
  resolveProjectAssetContentType,
  titleFromFilename,
} from "@/lib/projectAssetTypes";

test("allows images, audio, docs, and aup3", () => {
  assert.equal(isAllowedProjectAsset("mood.png", "image/png"), true);
  assert.equal(isAllowedProjectAsset("frame.JPEG", ""), true);
  assert.equal(isAllowedProjectAsset("style.webp"), true);
  assert.equal(isAllowedProjectAsset("ref.gif", "image/gif"), true);
  assert.equal(isAllowedProjectAsset("vo.wav", "audio/wav"), true);
  assert.equal(isAllowedProjectAsset("track.mp3"), true);
  assert.equal(isAllowedProjectAsset("stem.m4a"), true);
  assert.equal(isAllowedProjectAsset("take.aac"), true);
  assert.equal(isAllowedProjectAsset("script.docx"), true);
  assert.equal(isAllowedProjectAsset("notes.pdf", "application/pdf"), true);
  assert.equal(isAllowedProjectAsset("readme.txt"), true);
  assert.equal(isAllowedProjectAsset("session.aup3"), true);
  assert.equal(isAllowedProjectAsset("session.aup3", "application/octet-stream"), true);
});

test("rejects videos and unknown types", () => {
  assert.equal(isAllowedProjectAsset("cut.mp4", "video/mp4"), false);
  assert.equal(isAllowedProjectAsset("edit.mov"), false);
  assert.equal(isVideoUploadFile("edit.mov"), true);
  assert.equal(isAllowedProjectAsset("archive.zip"), false);
  assert.equal(isAllowedProjectAsset("payload.exe", "application/octet-stream"), false);
  assert.equal(isAllowedProjectAsset("mystery.bin"), false);
});

test("resolveProjectAssetContentType prefers extension mapping", () => {
  assert.equal(resolveProjectAssetContentType("x.aup3", "application/octet-stream"), "application/octet-stream");
  assert.equal(resolveProjectAssetContentType("x.aup3", ""), "application/octet-stream");
  assert.equal(resolveProjectAssetContentType("pic.JPG", "application/octet-stream"), "image/jpeg");
  assert.equal(
    resolveProjectAssetContentType(
      "script.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(resolveProjectAssetContentType("bad.zip", "application/zip"), null);
});

test("classifyProjectAssetKind maps families correctly", () => {
  assert.equal(classifyProjectAssetKind("image/png", "a.png"), "image");
  assert.equal(classifyProjectAssetKind("audio/mpeg", "a.mp3"), "audio");
  assert.equal(classifyProjectAssetKind("application/pdf", "a.pdf"), "document");
  assert.equal(
    classifyProjectAssetKind(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "a.docx",
    ),
    "document",
  );
  assert.equal(classifyProjectAssetKind("application/octet-stream", "session.aup3"), "other");
});

test("titleFromFilename strips extension", () => {
  assert.equal(titleFromFilename("My Script.docx"), "My Script");
  assert.equal(titleFromFilename("noext"), "noext");
});
