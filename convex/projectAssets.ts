import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { identityName, requireProjectAccess } from "./auth";
import { assertTeamCanStoreBytes, assertTeamHasActiveSubscription } from "./billingHelpers";
import { assertVideoFileSizeAllowed } from "./uploadLimits";
import {
  classifyProjectAssetKind,
  describeAllowedProjectAssets,
  resolveProjectAssetContentType,
  titleFromFilename,
} from "./projectAssetTypes";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

function resolveContentTypeOrThrow(filename: string, contentType: string | undefined) {
  const resolved = resolveProjectAssetContentType(filename, contentType);
  if (!resolved) {
    throw new Error(`Unsupported file format. Allowed: ${describeAllowedProjectAssets()}.`);
  }
  return resolved;
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, project } = await requireProjectAccess(ctx, args.projectId, "member");
    assertVideoFileSizeAllowed(args.fileSize);
    await assertTeamCanStoreBytes(ctx, project.teamId, args.fileSize);

    const normalizedContentType = resolveContentTypeOrThrow(args.filename, args.contentType);
    const kind = classifyProjectAssetKind(normalizedContentType, args.filename);
    const filename = args.filename.trim() || "file";

    const assetId = await ctx.db.insert("projectAssets", {
      projectId: args.projectId,
      uploadedByClerkId: user.subject,
      uploaderName: identityName(user),
      title: titleFromFilename(filename),
      filename,
      kind,
      contentType: normalizedContentType,
      fileSize: args.fileSize,
      status: "uploading",
      uploadUpdatedAt: Date.now(),
    });

    return assetId;
  },
});

export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    // Bound for v1 project root listing; assets are usually far fewer than videos.
    const assets = await ctx.db
      .query("projectAssets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(200);

    return assets.map((asset) => ({
      _id: asset._id,
      _creationTime: asset._creationTime,
      projectId: asset.projectId,
      title: asset.title,
      filename: asset.filename,
      kind: asset.kind,
      contentType: asset.contentType,
      fileSize: asset.fileSize,
      status: asset.status,
      uploadError: asset.uploadError,
      uploaderName: asset.uploaderName,
      uploadedByClerkId: asset.uploadedByClerkId,
    }));
  },
});

export const get = query({
  args: { assetId: v.id("projectAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return null;

    const { membership } = await requireProjectAccess(ctx, asset.projectId);
    return {
      ...asset,
      role: membership.role,
    };
  },
});

export const getForUpload = internalQuery({
  args: { assetId: v.id("projectAssets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assetId);
  },
});

export const assertAssetUploadAllowed = internalQuery({
  args: {
    assetId: v.id("projectAssets"),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    const project = await ctx.db.get(asset.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    assertVideoFileSizeAllowed(args.fileSize);

    const currentBytes =
      asset.status !== "failed" &&
      typeof asset.fileSize === "number" &&
      Number.isFinite(asset.fileSize)
        ? Math.max(0, asset.fileSize)
        : 0;
    const requestedBytes = Number.isFinite(args.fileSize) ? Math.max(0, args.fileSize) : 0;
    const incrementalBytes = Math.max(0, requestedBytes - currentBytes);

    if (incrementalBytes > 0) {
      await assertTeamCanStoreBytes(ctx, project.teamId, incrementalBytes);
    } else {
      await assertTeamHasActiveSubscription(ctx, project.teamId);
    }

    return null;
  },
});

export const setUploadInfo = internalMutation({
  args: {
    assetId: v.id("projectAssets"),
    s3Key: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
    s3MultipartUploadId: v.optional(v.string()),
    s3MultipartPartSizeBytes: v.optional(v.number()),
    s3MultipartPartCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    await ctx.db.patch(args.assetId, {
      s3Key: args.s3Key,
      fileSize: args.fileSize,
      contentType: args.contentType,
      s3MultipartUploadId: args.s3MultipartUploadId,
      s3MultipartPartSizeBytes: args.s3MultipartPartSizeBytes,
      s3MultipartPartCount: args.s3MultipartPartCount,
      status: "uploading",
      uploadError: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const touchUploadActivity = internalMutation({
  args: { assetId: v.id("projectAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return;
    await ctx.db.patch(args.assetId, { uploadUpdatedAt: Date.now() });
  },
});

export const clearMultipartUploadId = internalMutation({
  args: { assetId: v.id("projectAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return;
    await ctx.db.patch(args.assetId, {
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const reconcileUploadedObjectMetadata = internalMutation({
  args: {
    assetId: v.id("projectAssets"),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    const project = await ctx.db.get(asset.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const declaredSize =
      asset.status !== "failed" &&
      typeof asset.fileSize === "number" &&
      Number.isFinite(asset.fileSize)
        ? Math.max(0, asset.fileSize)
        : 0;
    const actualSize = Number.isFinite(args.fileSize) ? Math.max(0, args.fileSize) : 0;
    const sizeDelta = actualSize - declaredSize;

    if (sizeDelta > 0) {
      await assertTeamCanStoreBytes(ctx, project.teamId, sizeDelta);
    } else {
      await assertTeamHasActiveSubscription(ctx, project.teamId);
    }

    const kind = classifyProjectAssetKind(args.contentType, asset.filename);
    await ctx.db.patch(args.assetId, {
      fileSize: actualSize,
      contentType: args.contentType,
      kind,
    });
  },
});

export const markAsReady = internalMutation({
  args: { assetId: v.id("projectAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }
    await ctx.db.patch(args.assetId, {
      status: "ready",
      uploadError: undefined,
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const markAsFailed = internalMutation({
  args: {
    assetId: v.id("projectAssets"),
    uploadError: v.string(),
    clearObject: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return;

    await ctx.db.patch(args.assetId, {
      status: "failed",
      uploadError: args.uploadError,
      ...(args.clearObject
        ? {
            s3Key: undefined,
            s3MultipartUploadId: undefined,
            s3MultipartPartSizeBytes: undefined,
            s3MultipartPartCount: undefined,
            fileSize: undefined,
          }
        : {
            s3MultipartUploadId: undefined,
            s3MultipartPartSizeBytes: undefined,
            s3MultipartPartCount: undefined,
          }),
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const finalizeAbandonedUpload = internalMutation({
  args: {
    assetId: v.id("projectAssets"),
    uploadError: v.string(),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return;

    // Drop incomplete uploads entirely so the project list stays clean.
    if (asset.status === "uploading" || asset.status === "failed") {
      await ctx.db.delete(args.assetId);
      return;
    }

    await ctx.db.patch(args.assetId, {
      status: "failed",
      uploadError: args.uploadError,
      s3Key: undefined,
      s3MultipartUploadId: undefined,
      s3MultipartPartSizeBytes: undefined,
      s3MultipartPartCount: undefined,
      uploadUpdatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { assetId: v.id("projectAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }
    await requireProjectAccess(ctx, asset.projectId, "member");

    const s3Key = asset.s3Key;
    await ctx.db.delete(args.assetId);

    if (s3Key) {
      await ctx.scheduler.runAfter(0, internal.projectAssetActions.deleteAssetObject, {
        s3Key,
      });
    }
  },
});

/** Delete up to `budget` assets for a project (used by folder teardown). */
export async function deleteProjectAssetsBatch(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  budget: number,
): Promise<{ deleted: number; done: boolean; s3Keys: string[] }> {
  if (budget <= 0) {
    return { deleted: 0, done: false, s3Keys: [] };
  }

  const assets = await ctx.db
    .query("projectAssets")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .take(budget);

  const s3Keys: string[] = [];
  for (const asset of assets) {
    if (asset.s3Key) s3Keys.push(asset.s3Key);
    await ctx.db.delete(asset._id);
  }

  return {
    deleted: assets.length,
    done: assets.length < budget,
    s3Keys,
  };
}

export type ProjectAssetDoc = Doc<"projectAssets">;
