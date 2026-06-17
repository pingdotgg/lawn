"use node";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { action, ActionCtx, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  buildMuxPlaybackUrl,
  buildMuxThumbnailUrl,
  createMuxAssetFromInputUrl,
  createPublicPlaybackId,
  getMuxAsset,
} from "./mux";
import { BUCKET_NAME, getS3Client } from "./s3";
import {
  abortMultipartUploadSession,
  completeMultipartUploadSession,
  createMultipartUploadSession,
  getMultipartPlan,
  listMultipartUploadsInitiatedBefore,
  listMultipartUploadedParts,
  signMultipartUploadParts,
  type UploadedPartInfo,
} from "./s3Multipart";
import {
  MAX_SIGN_PARTS_BATCH,
  MAX_VIDEO_FILE_SIZE_BYTES,
  ORPHANED_MULTIPART_SWEEP_BATCH_SIZE,
  ORPHANED_MULTIPART_UPLOAD_THRESHOLD_MS,
  PRESIGN_SINGLE_PUT_EXPIRES_SEC,
  SINGLE_PUT_MAX_BYTES,
  STALE_UPLOAD_SWEEP_BATCH_SIZE,
  STALE_UPLOAD_THRESHOLD_MS,
  usesMultipartUpload,
} from "./uploadLimits";
const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);
const MUX_STATUS_SWEEP_BATCH_SIZE = 10;
const MUX_STATUS_SWEEP_LOCK = "mux-status-sweep";
const MUX_STATUS_SWEEP_LOCK_TTL_MS = 5 * 60 * 1000;

function getExtensionFromKey(key: string, fallback = "mp4") {
  let source = key;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      source = new URL(key).pathname;
    } catch {
      source = key;
    }
  }

  const ext = source.split(".").pop();
  if (!ext) return fallback;
  if (ext.length > 8 || /[^a-zA-Z0-9]/.test(ext)) return fallback;
  return ext.toLowerCase();
}

function sanitizeFilename(input: string) {
  const trimmed = input.trim();
  const base = trimmed.length > 0 ? trimmed : "video";
  const sanitized = base
    .replace(/["']/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return sanitized.slice(0, 120);
}

function buildDownloadFilename(title: string | undefined, key: string) {
  const ext = getExtensionFromKey(key);
  const safeTitle = sanitizeFilename(title ?? "video");
  return safeTitle.endsWith(`.${ext}`) ? safeTitle : `${safeTitle}.${ext}`;
}

async function buildDownloadResult(
  key: string,
  options: {
    title?: string;
    contentType?: string;
  },
): Promise<{ url: string; filename: string }> {
  const filename = buildDownloadFilename(options.title, key);

  return {
    url: await buildSignedBucketObjectUrl(key, {
      expiresIn: 600,
      filename,
      contentType: options.contentType ?? "video/mp4",
    }),
    filename,
  };
}

function getDownloadUnavailableMessage(status: string) {
  switch (status) {
    case "uploading":
      return "This video is still uploading and isn't ready to download yet.";
    case "processing":
      return "This video is still processing and isn't ready to download yet.";
    case "failed":
      return "This video couldn't be processed, so it isn't available to download.";
    default:
      return "This video isn't ready to download yet.";
  }
}

function normalizeBucketKey(key: string): string {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      const pathname = new URL(key).pathname.replace(/^\/+/, "");
      const bucketPrefix = `${BUCKET_NAME}/`;
      return pathname.startsWith(bucketPrefix) ? pathname.slice(bucketPrefix.length) : pathname;
    } catch {
      return key;
    }
  }
  return key;
}

async function buildSignedBucketObjectUrl(
  key: string,
  options?: {
    expiresIn?: number;
    filename?: string;
    contentType?: string;
  },
): Promise<string> {
  const normalizedKey = normalizeBucketKey(key);
  const s3 = getS3Client();
  const filename = options?.filename;
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: normalizedKey,
    ResponseContentDisposition: filename ? `attachment; filename="${filename}"` : undefined,
    ResponseContentType: options?.contentType,
  });
  return await getSignedUrl(s3, command, { expiresIn: options?.expiresIn ?? 600 });
}

function getValueString(value: unknown, field: string): string | null {
  const raw = (value as Record<string, unknown>)[field];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function normalizeContentType(contentType: string | null | undefined): string {
  if (!contentType) return "";
  return contentType.split(";")[0].trim().toLowerCase();
}

function isAllowedUploadContentType(contentType: string): boolean {
  return ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType);
}

function validateUploadRequestOrThrow(args: { fileSize: number; contentType: string }) {
  if (!Number.isFinite(args.fileSize) || args.fileSize <= 0) {
    throw new Error("Video file size must be greater than zero.");
  }

  if (args.fileSize > MAX_VIDEO_FILE_SIZE_BYTES) {
    throw new Error("Video file is too large. Maximum size is 30 GB.");
  }

  const normalizedContentType = normalizeContentType(args.contentType);
  if (!isAllowedUploadContentType(normalizedContentType)) {
    throw new Error("Unsupported video format. Allowed: mp4, mov, webm, mkv.");
  }

  return normalizedContentType;
}

function validateSinglePutSizeOrThrow(fileSize: number) {
  if (fileSize > SINGLE_PUT_MAX_BYTES) {
    throw new Error("Video file requires multipart upload.");
  }
}

function buildVideoObjectKey(videoId: Id<"videos">, filename: string) {
  const ext = getExtensionFromKey(filename);
  return `videos/${videoId}/${Date.now()}.${ext}`;
}

function normalizePartEtag(etag: string) {
  const trimmed = etag.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed;
  }
  return `"${trimmed.replaceAll('"', "")}"`;
}

function validatePartNumbersOrThrow(
  partNumbers: number[],
  partCount: number,
  options?: { maxBatchSize?: number },
) {
  if (partNumbers.length === 0) {
    throw new Error("At least one part number is required.");
  }
  const maxBatchSize = options?.maxBatchSize;
  if (maxBatchSize !== undefined && partNumbers.length > maxBatchSize) {
    throw new Error(`Cannot sign more than ${maxBatchSize} parts at once.`);
  }

  const seen = new Set<number>();
  for (const partNumber of partNumbers) {
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) {
      throw new Error("Invalid multipart part number.");
    }
    if (seen.has(partNumber)) {
      throw new Error("Duplicate multipart part number.");
    }
    seen.add(partNumber);
  }
}

async function getVideoForUpload(ctx: ActionCtx, videoId: Id<"videos">): Promise<Doc<"videos">> {
  const video = await ctx.runQuery(api.videos.getVideoForPlayback, { videoId });
  if (!video) {
    throw new Error("Video not found");
  }
  return video;
}

function canResumeMultipartUpload(
  video: {
    status: string;
    s3Key?: string;
    s3MultipartUploadId?: string;
    s3MultipartPartSizeBytes?: number;
    s3MultipartPartCount?: number;
    fileSize?: number;
  },
  fileSize: number,
) {
  return (
    video.status === "uploading" &&
    typeof video.s3Key === "string" &&
    video.s3Key.length > 0 &&
    typeof video.s3MultipartUploadId === "string" &&
    video.s3MultipartUploadId.length > 0 &&
    typeof video.s3MultipartPartSizeBytes === "number" &&
    video.s3MultipartPartSizeBytes > 0 &&
    typeof video.s3MultipartPartCount === "number" &&
    video.s3MultipartPartCount > 0 &&
    video.fileSize === fileSize
  );
}

function shouldDeleteUploadedObjectOnFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Unsupported video format") ||
    error.message.includes("Video file is too large") ||
    error.message.includes("Maximum size is 30 GB") ||
    error.message.includes("Uploaded video file not found") ||
    error.message.includes("Storage limit reached")
  );
}

async function requireVideoMemberAccess(ctx: ActionCtx, videoId: Id<"videos">) {
  const video = (await ctx.runQuery(api.videos.get, { videoId })) as { role?: string } | null;
  if (!video || video.role === "viewer") {
    throw new Error("Requires member role or higher");
  }
}

async function deleteUploadedObject(key: string) {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );
}

function buildPublicPlaybackSession(playbackId: string): { url: string; posterUrl: string } {
  return {
    url: buildMuxPlaybackUrl(playbackId),
    posterUrl: buildMuxThumbnailUrl(playbackId),
  };
}

async function ensurePublicPlaybackId(
  ctx: ActionCtx,
  params: {
    videoId?: Id<"videos">;
    muxAssetId?: string | null;
    muxPlaybackId: string;
  },
): Promise<string> {
  const { videoId, muxAssetId, muxPlaybackId } = params;
  if (!muxAssetId) return muxPlaybackId;

  const asset = await getMuxAsset(muxAssetId);
  const playbackIds = (asset.playback_ids ?? []) as Array<{
    id?: string;
    policy?: string;
  }>;

  let publicPlaybackId = playbackIds.find((entry) => entry.policy === "public" && entry.id)?.id;
  if (!publicPlaybackId) {
    const created = await createPublicPlaybackId(muxAssetId);
    publicPlaybackId = created.id;
  }

  const resolvedPlaybackId = publicPlaybackId ?? muxPlaybackId;
  if (videoId && resolvedPlaybackId !== muxPlaybackId) {
    await ctx.runMutation(internal.videos.setMuxPlaybackId, {
      videoId,
      muxPlaybackId: resolvedPlaybackId,
      thumbnailUrl: buildMuxThumbnailUrl(resolvedPlaybackId),
    });
  }

  return resolvedPlaybackId;
}

async function reconcileMuxAssetStatus(
  ctx: ActionCtx,
  params: {
    videoId: Id<"videos">;
    muxAssetId: string;
  },
) {
  const processingVideo = await ctx.runQuery(internal.videos.getMuxProcessingState, {
    videoId: params.videoId,
  });
  if (!processingVideo || processingVideo.muxAssetId !== params.muxAssetId) {
    return { status: "skipped" as const };
  }

  const asset = await getMuxAsset(params.muxAssetId);
  if (asset.status === "preparing") {
    return { status: "preparing" as const };
  }

  if (asset.status === "errored") {
    const uploadError =
      asset.errors?.messages?.find((message) => message.length > 0) ??
      "Mux failed to process this asset.";
    const updated = await ctx.runMutation(internal.videos.markMuxAssetAsFailed, {
      videoId: params.videoId,
      muxAssetId: params.muxAssetId,
      uploadError,
    });
    return {
      status: updated ? ("errored" as const) : ("skipped" as const),
    };
  }

  let playbackId = asset.playback_ids?.find((entry) => entry.policy === "public" && entry.id)?.id;
  if (!playbackId) {
    const created = await createPublicPlaybackId(params.muxAssetId);
    playbackId = created.id;
  }
  if (!playbackId) {
    throw new Error("Mux asset is ready but has no public playback ID.");
  }

  const updated = await ctx.runMutation(internal.videos.markAsReady, {
    videoId: params.videoId,
    muxAssetId: params.muxAssetId,
    muxPlaybackId: playbackId,
    duration: asset.duration,
    thumbnailUrl: buildMuxThumbnailUrl(playbackId),
  });
  return {
    status: updated ? ("ready" as const) : ("skipped" as const),
  };
}

const uploadedPartValidator = v.object({
  partNumber: v.number(),
  etag: v.string(),
});

const initiateVideoUploadReturns = v.union(
  v.object({
    strategy: v.literal("single"),
    url: v.string(),
    key: v.string(),
  }),
  v.object({
    strategy: v.literal("multipart"),
    key: v.string(),
    uploadId: v.string(),
    partSizeBytes: v.number(),
    partCount: v.number(),
    uploadedParts: v.array(uploadedPartValidator),
  }),
  v.object({
    strategy: v.literal("already_uploaded"),
    key: v.string(),
  }),
);

export const initiateVideoUpload = action({
  args: {
    videoId: v.id("videos"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  returns: initiateVideoUploadReturns,
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);
    const normalizedContentType = validateUploadRequestOrThrow({
      fileSize: args.fileSize,
      contentType: args.contentType,
    });
    const video = await getVideoForUpload(ctx, args.videoId);
    await ctx.runQuery(internal.videos.assertVideoUploadAllowed, {
      videoId: args.videoId,
      fileSize: args.fileSize,
    });

    if (usesMultipartUpload(args.fileSize)) {
      if (
        (video.status === "uploading" || video.status === "failed") &&
        video.s3Key &&
        !video.s3MultipartUploadId &&
        video.fileSize === args.fileSize
      ) {
        const s3 = getS3Client();
        try {
          const head = await s3.send(
            new HeadObjectCommand({
              Bucket: BUCKET_NAME,
              Key: video.s3Key,
            }),
          );
          if (head.ContentLength === args.fileSize) {
            return {
              strategy: "already_uploaded" as const,
              key: video.s3Key,
            };
          }
        } catch {
          // Fall through to start or resume a multipart upload.
        }
      }

      if (canResumeMultipartUpload(video, args.fileSize)) {
        const uploadedParts = await listMultipartUploadedParts({
          key: video.s3Key!,
          uploadId: video.s3MultipartUploadId!,
        });
        await ctx.runMutation(internal.videos.touchUploadActivity, {
          videoId: args.videoId,
        });
        return {
          strategy: "multipart" as const,
          key: video.s3Key!,
          uploadId: video.s3MultipartUploadId!,
          partSizeBytes: video.s3MultipartPartSizeBytes!,
          partCount: video.s3MultipartPartCount!,
          uploadedParts,
        };
      }

      if (video.s3Key && video.s3MultipartUploadId) {
        await abortMultipartUploadSession({
          key: video.s3Key,
          uploadId: video.s3MultipartUploadId,
        });
      }

      const key = buildVideoObjectKey(args.videoId, args.filename);
      const { uploadId } = await createMultipartUploadSession({
        key,
        contentType: normalizedContentType,
      });
      const { partSizeBytes, partCount } = getMultipartPlan(args.fileSize);

      await ctx.runMutation(internal.videos.setUploadInfo, {
        videoId: args.videoId,
        s3Key: key,
        fileSize: args.fileSize,
        contentType: normalizedContentType,
        s3MultipartUploadId: uploadId,
        s3MultipartPartSizeBytes: partSizeBytes,
        s3MultipartPartCount: partCount,
      });

      return {
        strategy: "multipart" as const,
        key,
        uploadId,
        partSizeBytes,
        partCount,
        uploadedParts: [],
      };
    }

    validateSinglePutSizeOrThrow(args.fileSize);

    const s3 = getS3Client();
    const key = buildVideoObjectKey(args.videoId, args.filename);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: normalizedContentType,
    });
    const url = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_SINGLE_PUT_EXPIRES_SEC,
    });

    await ctx.runMutation(internal.videos.setUploadInfo, {
      videoId: args.videoId,
      s3Key: key,
      fileSize: args.fileSize,
      contentType: normalizedContentType,
    });

    return {
      strategy: "single" as const,
      url,
      key,
    };
  },
});

export const signUploadParts = action({
  args: {
    videoId: v.id("videos"),
    partNumbers: v.array(v.number()),
  },
  returns: v.object({
    parts: v.array(
      v.object({
        partNumber: v.number(),
        url: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);
    const video = await getVideoForUpload(ctx, args.videoId);

    if (
      !video.s3Key ||
      !video.s3MultipartUploadId ||
      typeof video.s3MultipartPartCount !== "number"
    ) {
      throw new Error("Multipart upload has not been initiated for this video.");
    }

    validatePartNumbersOrThrow(args.partNumbers, video.s3MultipartPartCount, {
      maxBatchSize: MAX_SIGN_PARTS_BATCH,
    });

    const parts = await signMultipartUploadParts({
      key: video.s3Key,
      uploadId: video.s3MultipartUploadId,
      partNumbers: args.partNumbers,
    });
    await ctx.runMutation(internal.videos.touchUploadActivity, {
      videoId: args.videoId,
    });

    return { parts };
  },
});

export const completeMultipartUpload = action({
  args: {
    videoId: v.id("videos"),
    parts: v.array(uploadedPartValidator),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);
    const video = await getVideoForUpload(ctx, args.videoId);

    if (
      !video.s3Key ||
      !video.s3MultipartUploadId ||
      typeof video.s3MultipartPartCount !== "number"
    ) {
      throw new Error("Multipart upload has not been initiated for this video.");
    }

    const partCount = video.s3MultipartPartCount;
    if (args.parts.length !== partCount) {
      throw new Error("Multipart upload is missing one or more parts.");
    }

    const normalizedParts: UploadedPartInfo[] = args.parts.map((part) => ({
      partNumber: part.partNumber,
      etag: normalizePartEtag(part.etag),
    }));
    validatePartNumbersOrThrow(
      normalizedParts.map((part) => part.partNumber),
      partCount,
    );

    const partNumbers = new Set(normalizedParts.map((part) => part.partNumber));
    if (partNumbers.size !== partCount) {
      throw new Error("Multipart upload parts are incomplete.");
    }

    let completed = false;
    try {
      await completeMultipartUploadSession({
        key: video.s3Key,
        uploadId: video.s3MultipartUploadId,
        parts: normalizedParts,
      });
      completed = true;

      const s3 = getS3Client();
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: video.s3Key,
        }),
      );
      const contentLengthRaw = head.ContentLength;
      if (
        typeof contentLengthRaw !== "number" ||
        !Number.isFinite(contentLengthRaw) ||
        contentLengthRaw <= 0
      ) {
        throw new Error("Uploaded video file not found or empty.");
      }
      if (contentLengthRaw > MAX_VIDEO_FILE_SIZE_BYTES) {
        throw new Error("Video file is too large. Maximum size is 30 GB.");
      }

      const normalizedContentType = normalizeContentType(head.ContentType ?? video.contentType);
      if (!isAllowedUploadContentType(normalizedContentType)) {
        throw new Error("Unsupported video format. Allowed: mp4, mov, webm, mkv.");
      }

      await ctx.runMutation(internal.videos.reconcileUploadedObjectMetadata, {
        videoId: args.videoId,
        fileSize: contentLengthRaw,
        contentType: normalizedContentType,
      });

      await ctx.runMutation(internal.videos.clearMultipartUploadId, {
        videoId: args.videoId,
      });
    } catch (error) {
      try {
        if (completed) {
          await deleteUploadedObject(video.s3Key);
        } else if (!completed) {
          await abortMultipartUploadSession({
            key: video.s3Key,
            uploadId: video.s3MultipartUploadId,
          });
        }
      } catch {
        // Preserve the original completion, validation, or reconciliation failure.
      }

      await ctx.runMutation(internal.videos.finalizeAbandonedUpload, {
        videoId: args.videoId,
        uploadError: error instanceof Error ? error.message : "Upload failed after completion.",
      });
      throw error;
    }

    return { success: true };
  },
});

export const abortVideoUpload = action({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);
    const video = await getVideoForUpload(ctx, args.videoId);

    try {
      if (video.s3Key && video.s3MultipartUploadId) {
        await abortMultipartUploadSession({
          key: video.s3Key,
          uploadId: video.s3MultipartUploadId,
        });
      } else if (video.s3Key) {
        await deleteUploadedObject(video.s3Key);
      }
    } catch (error) {
      console.error("Failed to clean up cancelled upload storage", args.videoId, error);
    }

    await ctx.runMutation(internal.videos.finalizeAbandonedUpload, {
      videoId: args.videoId,
      uploadError: "Upload cancelled.",
    });

    return { success: true };
  },
});

/** @deprecated Use initiateVideoUpload */
export const getUploadUrl = action({
  args: {
    videoId: v.id("videos"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  returns: v.object({
    url: v.string(),
    uploadId: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);
    const normalizedContentType = validateUploadRequestOrThrow({
      fileSize: args.fileSize,
      contentType: args.contentType,
    });
    validateSinglePutSizeOrThrow(args.fileSize);
    await ctx.runQuery(internal.videos.assertVideoUploadAllowed, {
      videoId: args.videoId,
      fileSize: args.fileSize,
    });

    const s3 = getS3Client();
    const key = buildVideoObjectKey(args.videoId, args.filename);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: normalizedContentType,
    });
    const url = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_SINGLE_PUT_EXPIRES_SEC,
    });

    await ctx.runMutation(internal.videos.setUploadInfo, {
      videoId: args.videoId,
      s3Key: key,
      fileSize: args.fileSize,
      contentType: normalizedContentType,
    });

    return { url, uploadId: key };
  },
});

export const markUploadComplete = action({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);

    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.s3Key) {
      throw new Error("Original bucket file not found for this video");
    }
    if (video.status !== "uploading" && video.status !== "failed") {
      throw new Error("Video is not waiting for upload processing.");
    }

    try {
      const s3 = getS3Client();
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: video.s3Key,
        }),
      );
      const contentLengthRaw = head.ContentLength;
      if (
        typeof contentLengthRaw !== "number" ||
        !Number.isFinite(contentLengthRaw) ||
        contentLengthRaw <= 0
      ) {
        throw new Error("Uploaded video file not found or empty.");
      }
      const contentLength = contentLengthRaw;
      if (contentLength > MAX_VIDEO_FILE_SIZE_BYTES) {
        throw new Error("Video file is too large. Maximum size is 30 GB.");
      }

      const normalizedContentType = normalizeContentType(head.ContentType ?? video.contentType);
      if (!isAllowedUploadContentType(normalizedContentType)) {
        throw new Error("Unsupported video format. Allowed: mp4, mov, webm, mkv.");
      }

      await ctx.runMutation(internal.videos.reconcileUploadedObjectMetadata, {
        videoId: args.videoId,
        fileSize: contentLength,
        contentType: normalizedContentType,
      });

      await ctx.runMutation(internal.videos.markAsProcessing, {
        videoId: args.videoId,
      });

      const ingestUrl = await buildSignedBucketObjectUrl(video.s3Key, {
        expiresIn: 60 * 60 * 24,
      });
      const asset = await createMuxAssetFromInputUrl(args.videoId, ingestUrl);
      if (asset.id) {
        await ctx.runMutation(internal.videos.setMuxAssetReference, {
          videoId: args.videoId,
          muxAssetId: asset.id,
        });
      }
    } catch (error) {
      const shouldDeleteObject = shouldDeleteUploadedObjectOnFailure(error);
      if (shouldDeleteObject) {
        try {
          await deleteUploadedObject(video.s3Key);
        } catch {
          // No-op: preserve original processing failure.
        }
      }

      const uploadError =
        shouldDeleteObject && error instanceof Error
          ? error.message
          : "Mux ingest failed after upload.";
      if (shouldDeleteObject) {
        await ctx.runMutation(internal.videos.finalizeAbandonedUpload, {
          videoId: args.videoId,
          uploadError,
        });
        throw error;
      }
      await ctx.runMutation(internal.videos.markAsFailed, {
        videoId: args.videoId,
        uploadError,
      });
      throw new Error("Mux ingest failed after upload. Retry processing without re-uploading.");
    }

    return { success: true };
  },
});

export const markUploadFailed = action({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireVideoMemberAccess(ctx, args.videoId);
    const video = await getVideoForUpload(ctx, args.videoId);

    try {
      if (video.s3Key && video.s3MultipartUploadId) {
        await abortMultipartUploadSession({
          key: video.s3Key,
          uploadId: video.s3MultipartUploadId,
        });
      } else if (video.s3Key) {
        await deleteUploadedObject(video.s3Key);
      }
    } catch (error) {
      console.error("Failed to clean up permanently failed upload storage", args.videoId, error);
    }

    await ctx.runMutation(internal.videos.finalizeAbandonedUpload, {
      videoId: args.videoId,
      uploadError: "Upload failed before Mux could process the asset.",
    });

    return { success: true };
  },
});

export const sweepStaleUploads = internalAction({
  args: {},
  returns: v.object({
    reclaimed: v.number(),
  }),
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_UPLOAD_THRESHOLD_MS;
    const candidates = await ctx.runQuery(internal.videos.listStaleUploadCandidates, {
      cutoff,
      limit: STALE_UPLOAD_SWEEP_BATCH_SIZE,
    });
    let reclaimed = 0;

    for (const candidate of candidates) {
      const claimed = await ctx.runMutation(internal.videos.claimStaleUpload, {
        videoId: candidate.videoId,
        cutoff,
      });
      if (!claimed) continue;

      try {
        if (claimed.storage.kind === "multipart") {
          await abortMultipartUploadSession({
            key: claimed.storage.key,
            uploadId: claimed.storage.uploadId,
          });
        } else if (claimed.storage.kind === "object") {
          await deleteUploadedObject(claimed.storage.key);
        }

        reclaimed += 1;
      } catch (error) {
        console.error("Failed to reclaim stale upload", candidate.videoId, error);
      }
    }

    return { reclaimed };
  },
});

export const sweepOrphanedMultipartUploads = internalAction({
  args: {},
  returns: v.object({
    aborted: v.number(),
  }),
  handler: async () => {
    const uploads = await listMultipartUploadsInitiatedBefore({
      cutoff: Date.now() - ORPHANED_MULTIPART_UPLOAD_THRESHOLD_MS,
      limit: ORPHANED_MULTIPART_SWEEP_BATCH_SIZE,
    });
    let aborted = 0;

    for (const upload of uploads) {
      try {
        await abortMultipartUploadSession(upload);
        aborted += 1;
      } catch (error) {
        console.error("Failed to abort orphaned multipart upload", {
          key: upload.key,
          uploadId: upload.uploadId,
          error,
        });
      }
    }

    return { aborted };
  },
});

const muxAssetCheckResultValidator = v.object({
  status: v.union(
    v.literal("preparing"),
    v.literal("ready"),
    v.literal("errored"),
    v.literal("skipped"),
  ),
});

type MuxAssetCheckResult = {
  status: "preparing" | "ready" | "errored" | "skipped";
};

export const checkMuxAssetStatus = action({
  args: {
    videoId: v.id("videos"),
  },
  returns: muxAssetCheckResultValidator,
  handler: async (ctx, args): Promise<MuxAssetCheckResult> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });
    if (!video || video.status !== "processing" || !video.muxAssetId) {
      return { status: "skipped" as const };
    }

    return await reconcileMuxAssetStatus(ctx, {
      videoId: args.videoId,
      muxAssetId: video.muxAssetId,
    });
  },
});

export const sweepMuxAssetStatuses = internalAction({
  args: {},
  returns: v.object({
    checked: v.number(),
    reconciled: v.number(),
  }),
  handler: async (ctx) => {
    const lockOwner = crypto.randomUUID();
    const locked = await ctx.runMutation(internal.videos.claimCronLock, {
      name: MUX_STATUS_SWEEP_LOCK,
      owner: lockOwner,
      ttlMs: MUX_STATUS_SWEEP_LOCK_TTL_MS,
    });
    if (!locked) {
      return { checked: 0, reconciled: 0 };
    }

    try {
      const candidates = await ctx.runMutation(internal.videos.claimMuxProcessingCandidates, {
        limit: MUX_STATUS_SWEEP_BATCH_SIZE,
      });
      let checked = 0;
      let reconciled = 0;

      for (const candidate of candidates) {
        try {
          const result = await reconcileMuxAssetStatus(ctx, candidate);
          checked += 1;
          if (result.status === "ready" || result.status === "errored") {
            reconciled += 1;
          }
        } catch (error) {
          console.error("Failed to reconcile Mux asset status", {
            videoId: candidate.videoId,
            muxAssetId: candidate.muxAssetId,
            error,
          });
        }
      }

      return { checked, reconciled };
    } finally {
      await ctx.runMutation(internal.videos.releaseCronLock, {
        name: MUX_STATUS_SWEEP_LOCK,
        owner: lockOwner,
      });
    }
  },
});

export const getPlaybackSession = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
    posterUrl: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; posterUrl: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.muxPlaybackId || video.status !== "ready") {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: args.videoId,
      muxAssetId: video.muxAssetId,
      muxPlaybackId: video.muxPlaybackId,
    });
    return buildPublicPlaybackSession(playbackId);
  },
});

export const getPlaybackUrl = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.muxPlaybackId || video.status !== "ready") {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: args.videoId,
      muxAssetId: video.muxAssetId,
      muxPlaybackId: video.muxPlaybackId,
    });
    const session = buildPublicPlaybackSession(playbackId);
    return { url: session.url };
  },
});

export const getOriginalPlaybackUrl = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
    contentType: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; contentType: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video || !video.s3Key) {
      throw new Error("Original bucket file not found for this video");
    }

    const contentType = video.contentType ?? "video/mp4";
    return {
      url: await buildSignedBucketObjectUrl(video.s3Key, {
        expiresIn: 600,
        contentType,
      }),
      contentType,
    };
  },
});

export const getPublicPlaybackSession = action({
  args: { publicId: v.string() },
  returns: v.object({
    url: v.string(),
    posterUrl: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; posterUrl: string }> => {
    const result = await ctx.runQuery(api.videos.getByPublicId, {
      publicId: args.publicId,
    });

    if (!result?.video?.muxPlaybackId) {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: result.video._id,
      muxAssetId: result.video.muxAssetId,
      muxPlaybackId: result.video.muxPlaybackId,
    });
    return buildPublicPlaybackSession(playbackId);
  },
});

export const getSharedPlaybackSession = action({
  args: { grantToken: v.string() },
  returns: v.object({
    url: v.string(),
    posterUrl: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; posterUrl: string }> => {
    const result = await ctx.runQuery(api.videos.getByShareGrant, {
      grantToken: args.grantToken,
    });

    if (!result?.video?.muxPlaybackId) {
      throw new Error("Video not found or not ready");
    }

    const playbackId = await ensurePublicPlaybackId(ctx, {
      videoId: result.video._id,
      muxAssetId: result.video.muxAssetId,
      muxPlaybackId: result.video.muxPlaybackId,
    });
    return buildPublicPlaybackSession(playbackId);
  },
});

export const getDownloadUrl = action({
  args: { videoId: v.id("videos") },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const video = await ctx.runQuery(api.videos.getVideoForPlayback, {
      videoId: args.videoId,
    });

    if (!video) {
      throw new Error("Video not found");
    }

    if (video.status !== "ready") {
      throw new Error(getDownloadUnavailableMessage(video.status));
    }

    const key = getValueString(video, "s3Key");
    if (!key) {
      throw new Error("Original bucket file not found for this video");
    }

    return await buildDownloadResult(key, {
      title: video.title,
      contentType: video.contentType,
    });
  },
});

export const getPublicDownloadUrl = action({
  args: { publicId: v.string() },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const result = await ctx.runQuery(api.videos.getByPublicIdForDownload, {
      publicId: args.publicId,
    });

    if (!result?.video) {
      throw new Error("Video not found");
    }

    if (result.video.status !== "ready") {
      throw new Error(getDownloadUnavailableMessage(result.video.status));
    }

    const key = getValueString(result.video, "s3Key");
    if (!key) {
      throw new Error("Original bucket file not found for this video");
    }

    return await buildDownloadResult(key, {
      title: result.video.title,
      contentType: result.video.contentType,
    });
  },
});

export const getSharedDownloadUrl = action({
  args: { grantToken: v.string() },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    const result = await ctx.runQuery(api.videos.getByShareGrantForDownload, {
      grantToken: args.grantToken,
    });

    if (!result?.video) {
      throw new Error("Video not found");
    }

    if (!result.allowDownload) {
      throw new Error("Downloads are disabled for this shared link.");
    }

    if (result.video.status !== "ready") {
      throw new Error(getDownloadUnavailableMessage(result.video.status));
    }

    const key = getValueString(result.video, "s3Key");
    if (!key) {
      throw new Error("Original bucket file not found for this video");
    }

    return await buildDownloadResult(key, {
      title: result.video.title,
      contentType: result.video.contentType,
    });
  },
});
