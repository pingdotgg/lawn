"use node";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getS3Client, BUCKET_NAME } from "./s3";
import { abortMultipartUploadSession, multipartUploadHasParts } from "./s3Multipart";
import { deleteMuxAsset, getMuxClient } from "./mux";

export function isMissingMedia(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? error.name : undefined;
  if (name === "NoSuchBucket" || name === "AccessDenied") return false;
  if (name === "NoSuchKey" || name === "NoSuchUpload" || name === "NotFound") return true;
  if ("status" in error && error.status === 404) return true;
  if ("$metadata" in error && error.$metadata && typeof error.$metadata === "object") {
    return "httpStatusCode" in error.$metadata && error.$metadata.httpStatusCode === 404;
  }
  return false;
}

export const drain = internalAction({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.runMutation(internal.mediaCleanup.claimBatch, {});
    // Ten resources per invocation. Each result is acknowledged independently;
    // a crashed action leaves leased jobs available for a later cron invocation.
    for (const job of jobs) {
      let failure: string | undefined;
      try {
        switch (job.kind) {
          case "object":
            await getS3Client().send(
              new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: job.key }),
            );
            break;
          case "multipart":
            await abortMultipartUploadSession({ key: job.key, uploadId: job.uploadId! });
            if (await multipartUploadHasParts({ key: job.key, uploadId: job.uploadId! })) {
              throw new Error("Multipart parts still present after abort; retrying");
            }
            break;
          case "mux":
            await deleteMuxAsset(job.key);
            break;
          case "muxUpload": {
            const mux = getMuxClient();
            const upload = await mux.video.uploads.retrieve(job.key);
            if (upload.asset_id) {
              await ctx.runMutation(internal.mediaCleanup.enqueue, {
                kind: "mux",
                key: upload.asset_id,
              });
            } else if (upload.status === "waiting") {
              await mux.video.uploads.cancel(job.key);
            }
            break;
          }
        }
      } catch (error) {
        if (!isMissingMedia(error))
          failure =
            error instanceof Error ? error.message.slice(0, 500) : "External media cleanup failed";
      }
      await ctx.runMutation(internal.mediaCleanup.finish, {
        jobId: job._id,
        attempt: job.attempts,
        error: failure,
      });
    }
    if (jobs.length > 0) await ctx.scheduler.runAfter(0, internal.mediaCleanupActions.drain, {});
  },
});

// Webhooks normally discover late assets immediately. This bounded inventory
// pass also recovers a successful create whose response/webhook was lost. Never
// infer ownership merely from an unknown passthrough: require a live video or tombstone.
export const recoverMux = internalAction({
  args: {},
  handler: async (ctx) => {
    const page = await ctx.runQuery(internal.mediaCleanup.muxRecoveryPage, {});
    const result = await getMuxClient().video.assets.list({ page, limit: 100 });
    await ctx.runMutation(internal.mediaCleanup.recoverMuxAssets, {
      assets: result.data.map((asset) => ({
        id: asset.id,
        passthrough: asset.passthrough,
        uploadId: asset.upload_id,
      })),
      page,
      nextPage: result.data.length === 100 ? page + 1 : 1,
    });
  },
});
