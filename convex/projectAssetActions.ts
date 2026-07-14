"use node";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { BUCKET_NAME, getS3Client } from "./s3";
import {
  abortMultipartUploadSession,
  completeMultipartUploadSession,
  createMultipartUploadSession,
  getMultipartPlan,
  listMultipartUploadedParts,
  signMultipartUploadParts,
  type UploadedPartInfo,
} from "./s3Multipart";
import {
  MAX_SIGN_PARTS_BATCH,
  PRESIGN_SINGLE_PUT_EXPIRES_SEC,
  SINGLE_PUT_MAX_BYTES,
  assertVideoFileSizeAllowed,
  usesMultipartUpload,
} from "./uploadLimits";
import {
  describeAllowedProjectAssets,
  normalizeContentType,
  resolveProjectAssetContentType,
} from "./projectAssetTypes";

const uploadedPartValidator = v.object({
  partNumber: v.number(),
  etag: v.string(),
});

const initiateReturns = v.union(
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
);

function getExtensionFromKey(key: string, fallback = "bin") {
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
  const base = trimmed.length > 0 ? trimmed : "file";
  const sanitized = base
    .replace(/["']/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return sanitized.slice(0, 120);
}

function buildAssetObjectKey(assetId: Id<"projectAssets">, filename: string) {
  const ext = getExtensionFromKey(filename, "bin");
  return `assets/${assetId}/${Date.now()}.${ext}`;
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
    inline?: boolean;
  },
): Promise<string> {
  const normalizedKey = normalizeBucketKey(key);
  const s3 = getS3Client();
  const filename = options?.filename;
  const disposition = filename
    ? `${options?.inline ? "inline" : "attachment"}; filename="${filename}"`
    : options?.inline
      ? "inline"
      : undefined;
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: normalizedKey,
    ResponseContentDisposition: disposition,
    ResponseContentType: options?.contentType,
  });
  return await getSignedUrl(s3, command, { expiresIn: options?.expiresIn ?? 600 });
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

function validateAssetUploadRequestOrThrow(args: {
  filename: string;
  fileSize: number;
  contentType: string;
}) {
  if (!Number.isFinite(args.fileSize) || args.fileSize <= 0) {
    throw new Error("File size must be greater than zero.");
  }
  assertVideoFileSizeAllowed(args.fileSize);

  const resolved = resolveProjectAssetContentType(args.filename, args.contentType);
  if (!resolved) {
    throw new Error(`Unsupported file format. Allowed: ${describeAllowedProjectAssets()}.`);
  }
  return resolved;
}

function canResumeMultipartUpload(
  asset: {
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
    asset.status === "uploading" &&
    typeof asset.s3Key === "string" &&
    asset.s3Key.length > 0 &&
    typeof asset.s3MultipartUploadId === "string" &&
    asset.s3MultipartUploadId.length > 0 &&
    typeof asset.s3MultipartPartSizeBytes === "number" &&
    asset.s3MultipartPartSizeBytes > 0 &&
    typeof asset.s3MultipartPartCount === "number" &&
    asset.s3MultipartPartCount > 0 &&
    asset.fileSize === fileSize
  );
}

type AssetAccessRow = Doc<"projectAssets"> & { role: string };

async function loadAssetWithAccess(
  ctx: ActionCtx,
  assetId: Id<"projectAssets">,
): Promise<AssetAccessRow | null> {
  const asset: AssetAccessRow | null = await ctx.runQuery(api.projectAssets.get, { assetId });
  return asset;
}

async function requireAssetMemberAccess(ctx: ActionCtx, assetId: Id<"projectAssets">) {
  const asset = await loadAssetWithAccess(ctx, assetId);
  if (!asset || asset.role === "viewer") {
    throw new Error("Requires member role or higher");
  }
}

async function getAssetForUpload(
  ctx: ActionCtx,
  assetId: Id<"projectAssets">,
): Promise<Doc<"projectAssets">> {
  const asset = await ctx.runQuery(internal.projectAssets.getForUpload, { assetId });
  if (!asset) {
    throw new Error("Asset not found");
  }
  return asset;
}

async function deleteUploadedObject(key: string) {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: normalizeBucketKey(key),
    }),
  );
}

function shouldDeleteUploadedObjectOnFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Unsupported file format") ||
    error.message.includes("File is too large") ||
    error.message.includes("Video file is too large") ||
    error.message.includes("Uploaded file not found") ||
    error.message.includes("Storage limit reached")
  );
}

export const initiateAssetUpload = action({
  args: {
    assetId: v.id("projectAssets"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  returns: initiateReturns,
  handler: async (ctx, args) => {
    await requireAssetMemberAccess(ctx, args.assetId);
    const normalizedContentType = validateAssetUploadRequestOrThrow({
      filename: args.filename,
      fileSize: args.fileSize,
      contentType: args.contentType,
    });
    const asset = await getAssetForUpload(ctx, args.assetId);
    await ctx.runQuery(internal.projectAssets.assertAssetUploadAllowed, {
      assetId: args.assetId,
      fileSize: args.fileSize,
    });

    if (usesMultipartUpload(args.fileSize)) {
      if (canResumeMultipartUpload(asset, args.fileSize)) {
        const uploadedParts = await listMultipartUploadedParts({
          key: asset.s3Key!,
          uploadId: asset.s3MultipartUploadId!,
        });
        await ctx.runMutation(internal.projectAssets.touchUploadActivity, {
          assetId: args.assetId,
        });
        return {
          strategy: "multipart" as const,
          key: asset.s3Key!,
          uploadId: asset.s3MultipartUploadId!,
          partSizeBytes: asset.s3MultipartPartSizeBytes!,
          partCount: asset.s3MultipartPartCount!,
          uploadedParts,
        };
      }

      if (asset.s3Key && asset.s3MultipartUploadId) {
        await abortMultipartUploadSession({
          key: asset.s3Key,
          uploadId: asset.s3MultipartUploadId,
        });
      }

      const key = buildAssetObjectKey(args.assetId, args.filename);
      const { uploadId } = await createMultipartUploadSession({
        key,
        contentType: normalizedContentType,
      });
      const { partSizeBytes, partCount } = getMultipartPlan(args.fileSize);

      await ctx.runMutation(internal.projectAssets.setUploadInfo, {
        assetId: args.assetId,
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

    if (args.fileSize > SINGLE_PUT_MAX_BYTES) {
      throw new Error("File requires multipart upload.");
    }

    const s3 = getS3Client();
    const key = buildAssetObjectKey(args.assetId, args.filename);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: normalizedContentType,
    });
    const url = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_SINGLE_PUT_EXPIRES_SEC,
    });

    await ctx.runMutation(internal.projectAssets.setUploadInfo, {
      assetId: args.assetId,
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

export const signAssetUploadParts = action({
  args: {
    assetId: v.id("projectAssets"),
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
    await requireAssetMemberAccess(ctx, args.assetId);
    const asset = await getAssetForUpload(ctx, args.assetId);

    if (
      !asset.s3Key ||
      !asset.s3MultipartUploadId ||
      typeof asset.s3MultipartPartCount !== "number"
    ) {
      throw new Error("Multipart upload has not been initiated for this asset.");
    }

    validatePartNumbersOrThrow(args.partNumbers, asset.s3MultipartPartCount, {
      maxBatchSize: MAX_SIGN_PARTS_BATCH,
    });

    const parts = await signMultipartUploadParts({
      key: asset.s3Key,
      uploadId: asset.s3MultipartUploadId,
      partNumbers: args.partNumbers,
    });
    await ctx.runMutation(internal.projectAssets.touchUploadActivity, {
      assetId: args.assetId,
    });

    return { parts };
  },
});

export const completeAssetMultipartUpload = action({
  args: {
    assetId: v.id("projectAssets"),
    parts: v.array(uploadedPartValidator),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAssetMemberAccess(ctx, args.assetId);
    const asset = await getAssetForUpload(ctx, args.assetId);

    if (
      !asset.s3Key ||
      !asset.s3MultipartUploadId ||
      typeof asset.s3MultipartPartCount !== "number"
    ) {
      throw new Error("Multipart upload has not been initiated for this asset.");
    }

    const partCount = asset.s3MultipartPartCount;
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
        key: asset.s3Key,
        uploadId: asset.s3MultipartUploadId,
        parts: normalizedParts,
      });
      completed = true;

      const s3 = getS3Client();
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: asset.s3Key,
        }),
      );
      const contentLengthRaw = head.ContentLength;
      if (
        typeof contentLengthRaw !== "number" ||
        !Number.isFinite(contentLengthRaw) ||
        contentLengthRaw <= 0
      ) {
        throw new Error("Uploaded file not found or empty.");
      }
      assertVideoFileSizeAllowed(contentLengthRaw);

      const resolved = resolveProjectAssetContentType(
        asset.filename,
        normalizeContentType(head.ContentType ?? asset.contentType),
      );
      if (!resolved) {
        throw new Error(`Unsupported file format. Allowed: ${describeAllowedProjectAssets()}.`);
      }

      await ctx.runMutation(internal.projectAssets.reconcileUploadedObjectMetadata, {
        assetId: args.assetId,
        fileSize: contentLengthRaw,
        contentType: resolved,
      });
      await ctx.runMutation(internal.projectAssets.clearMultipartUploadId, {
        assetId: args.assetId,
      });
    } catch (error) {
      try {
        if (completed) {
          await deleteUploadedObject(asset.s3Key);
        } else {
          await abortMultipartUploadSession({
            key: asset.s3Key,
            uploadId: asset.s3MultipartUploadId,
          });
        }
      } catch {
        // Preserve the original failure.
      }

      await ctx.runMutation(internal.projectAssets.finalizeAbandonedUpload, {
        assetId: args.assetId,
        uploadError: error instanceof Error ? error.message : "Upload failed after completion.",
      });
      throw error;
    }

    return { success: true };
  },
});

export const markAssetUploadComplete = action({
  args: {
    assetId: v.id("projectAssets"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAssetMemberAccess(ctx, args.assetId);
    const asset = await getAssetForUpload(ctx, args.assetId);

    if (!asset.s3Key) {
      throw new Error("Uploaded file not found for this asset");
    }
    if (asset.status !== "uploading" && asset.status !== "failed") {
      throw new Error("Asset is not waiting for upload processing.");
    }

    try {
      const s3 = getS3Client();
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: asset.s3Key,
        }),
      );
      const contentLengthRaw = head.ContentLength;
      if (
        typeof contentLengthRaw !== "number" ||
        !Number.isFinite(contentLengthRaw) ||
        contentLengthRaw <= 0
      ) {
        throw new Error("Uploaded file not found or empty.");
      }
      assertVideoFileSizeAllowed(contentLengthRaw);

      const resolved = resolveProjectAssetContentType(
        asset.filename,
        normalizeContentType(head.ContentType ?? asset.contentType),
      );
      if (!resolved) {
        throw new Error(`Unsupported file format. Allowed: ${describeAllowedProjectAssets()}.`);
      }

      await ctx.runMutation(internal.projectAssets.reconcileUploadedObjectMetadata, {
        assetId: args.assetId,
        fileSize: contentLengthRaw,
        contentType: resolved,
      });
      await ctx.runMutation(internal.projectAssets.markAsReady, {
        assetId: args.assetId,
      });
    } catch (error) {
      const shouldDeleteObject = shouldDeleteUploadedObjectOnFailure(error);
      if (shouldDeleteObject && asset.s3Key) {
        try {
          await deleteUploadedObject(asset.s3Key);
        } catch {
          // Keep original error.
        }
      }
      await ctx.runMutation(internal.projectAssets.markAsFailed, {
        assetId: args.assetId,
        uploadError: error instanceof Error ? error.message : "Upload processing failed.",
        clearObject: shouldDeleteObject,
      });
      throw error;
    }

    return { success: true };
  },
});

export const abortAssetUpload = action({
  args: { assetId: v.id("projectAssets") },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAssetMemberAccess(ctx, args.assetId);
    const asset = await getAssetForUpload(ctx, args.assetId);

    try {
      if (asset.s3Key && asset.s3MultipartUploadId) {
        await abortMultipartUploadSession({
          key: asset.s3Key,
          uploadId: asset.s3MultipartUploadId,
        });
      } else if (asset.s3Key) {
        await deleteUploadedObject(asset.s3Key);
      }
    } catch (error) {
      console.error("Failed to clean up cancelled asset upload", args.assetId, error);
    }

    await ctx.runMutation(internal.projectAssets.finalizeAbandonedUpload, {
      assetId: args.assetId,
      uploadError: "Upload cancelled.",
    });

    return { success: true };
  },
});

export const getAssetDownloadUrl = action({
  args: { assetId: v.id("projectAssets") },
  returns: v.object({
    url: v.string(),
    filename: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; filename: string }> => {
    // Any team member with project access may download.
    const asset = await loadAssetWithAccess(ctx, args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }
    if (asset.status !== "ready" || !asset.s3Key) {
      throw new Error("This file isn't ready to download yet.");
    }

    const filename = sanitizeFilename(asset.filename || asset.title);
    const url = await buildSignedBucketObjectUrl(asset.s3Key, {
      expiresIn: 600,
      filename,
      contentType: asset.contentType,
      inline: false,
    });
    return { url, filename };
  },
});

export const getAssetPreviewUrl = action({
  args: { assetId: v.id("projectAssets") },
  returns: v.object({
    url: v.string(),
    contentType: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; contentType: string }> => {
    const asset = await loadAssetWithAccess(ctx, args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }
    if (asset.kind !== "image") {
      throw new Error("Preview is only available for images.");
    }
    if (asset.status !== "ready" || !asset.s3Key) {
      throw new Error("This image isn't ready to preview yet.");
    }

    const filename = sanitizeFilename(asset.filename || asset.title);
    const url = await buildSignedBucketObjectUrl(asset.s3Key, {
      expiresIn: 600,
      filename,
      contentType: asset.contentType,
      inline: true,
    });
    return { url, contentType: asset.contentType };
  },
});

export const deleteAssetObject = internalAction({
  args: { s3Key: v.string() },
  handler: async (_ctx, args) => {
    try {
      await deleteUploadedObject(args.s3Key);
    } catch (error) {
      console.error("Failed to delete asset object", args.s3Key, error);
    }
  },
});
