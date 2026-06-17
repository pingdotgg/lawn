import test from "node:test";
import assert from "node:assert/strict";
import type { Id } from "@convex/_generated/dataModel";
import {
  uploadCreationIntentsMatch,
  type MultipartUploadResumeSession,
} from "@/lib/uploadResumeDb";

function session(overrides: Partial<MultipartUploadResumeSession>): MultipartUploadResumeSession {
  return {
    videoId: "video_1" as Id<"videos">,
    fileName: "cut.mp4",
    fileSize: 100,
    fileLastModified: 123,
    fileFingerprint: "fingerprint",
    strategy: "multipart",
    uploadId: "upload",
    s3Key: "key",
    partSizeBytes: 50,
    partCount: 2,
    completedParts: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

test("standalone and version upload intents cannot cross-resume", () => {
  const projectId = "project_1" as Id<"projects">;
  const sourceVideoId = "video_source" as Id<"videos">;
  const versionStackId = "video_stack" as Id<"videos">;
  const standalone = session({
    creationIntent: { kind: "standalone", projectId },
  });
  const version = session({
    creationIntent: { kind: "version", versionStackId },
  });

  assert.equal(uploadCreationIntentsMatch(standalone, { kind: "standalone", projectId }), true);
  assert.equal(
    uploadCreationIntentsMatch(standalone, {
      kind: "version",
      sourceVideoId,
      versionStackId,
    }),
    false,
  );
  assert.equal(uploadCreationIntentsMatch(version, { kind: "standalone", projectId }), false);
  assert.equal(
    uploadCreationIntentsMatch(version, {
      kind: "version",
      sourceVideoId,
      versionStackId,
    }),
    true,
  );
  assert.equal(
    uploadCreationIntentsMatch(version, {
      kind: "version",
      sourceVideoId: "video_other" as Id<"videos">,
      versionStackId,
    }),
    true,
  );
  assert.equal(
    uploadCreationIntentsMatch(version, {
      kind: "version",
      sourceVideoId,
      versionStackId: "video_other_stack" as Id<"videos">,
    }),
    false,
  );
});

test("legacy version sessions fall back to their exact source video", () => {
  const sourceVideoId = "video_source" as Id<"videos">;
  const legacyVersion = session({
    creationIntent: { kind: "version", sourceVideoId },
  });

  assert.equal(
    uploadCreationIntentsMatch(legacyVersion, {
      kind: "version",
      sourceVideoId,
      versionStackId: "video_stack" as Id<"videos">,
    }),
    true,
  );
  assert.equal(
    uploadCreationIntentsMatch(legacyVersion, {
      kind: "version",
      sourceVideoId: "video_other" as Id<"videos">,
      versionStackId: "video_stack" as Id<"videos">,
    }),
    false,
  );
});

test("legacy resume sessions remain standalone and project-scoped", () => {
  const projectId = "project_1" as Id<"projects">;
  const legacy = session({ projectId });

  assert.equal(uploadCreationIntentsMatch(legacy, { kind: "standalone", projectId }), true);
  assert.equal(
    uploadCreationIntentsMatch(legacy, {
      kind: "standalone",
      projectId: "project_2" as Id<"projects">,
    }),
    false,
  );
  assert.equal(
    uploadCreationIntentsMatch(legacy, {
      kind: "version",
      sourceVideoId: "video_source" as Id<"videos">,
      versionStackId: "video_stack" as Id<"videos">,
    }),
    false,
  );
});
