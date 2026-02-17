"use node";

import { v } from "convex/values";
import { internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  buildMuxThumbnailUrl,
  getMuxAsset,
  verifyMuxWebhookSignature,
} from "./mux";

type MuxData = {
  id?: string;
  upload_id?: string;
  asset_id?: string;
  passthrough?: string;
  duration?: number;
  errors?: Array<{ message?: string }>;
  error?: { message?: string };
  playback_ids?: Array<{ id?: string; policy?: string }>;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getErrorMessage(data: MuxData): string | undefined {
  const nested = data.errors?.find((item) => typeof item?.message === "string")?.message;
  if (nested) return nested;
  return asString(data.error?.message);
}

function getPreferredPlaybackId(playbackIds: MuxData["playback_ids"]): string | undefined {
  if (!playbackIds || playbackIds.length === 0) return undefined;

  const publicPlayback = playbackIds.find((item) => item.policy === "public" && item.id);
  if (publicPlayback?.id) return publicPlayback.id;

  return playbackIds.find((item) => typeof item.id === "string")?.id;
}

async function resolveVideoIdFromMuxRefs(
  ctx: ActionCtx,
  data: MuxData,
): Promise<Id<"videos"> | null> {
  const uploadId = asString(data.upload_id);
  if (uploadId) {
    const fromUpload = (await ctx.runQuery(internal.videos.getVideoByMuxUploadId, {
      muxUploadId: uploadId,
    })) as { videoId?: Id<"videos"> } | null;
    if (fromUpload?.videoId) {
      return fromUpload.videoId;
    }
  }

  const assetId = asString(data.asset_id);
  if (assetId) {
    const fromAsset = (await ctx.runQuery(internal.videos.getVideoByMuxAssetId, {
      muxAssetId: assetId,
    })) as { videoId?: Id<"videos"> } | null;
    if (fromAsset?.videoId) {
      return fromAsset.videoId;
    }
  }

  const passthrough = asString(data.passthrough);
  if (passthrough) {
    return passthrough as Id<"videos">;
  }

  return null;
}

export const processWebhook = internalAction({
  args: {
    rawBody: v.string(),
    signature: v.optional(v.string()),
  },
  returns: v.object({
    status: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      verifyMuxWebhookSignature(args.rawBody, args.signature ?? null);
    } catch (error) {
      console.error("Mux webhook signature verification failed", error);
      return { status: 401, message: "Invalid signature" };
    }

    let event: { type?: string; data?: MuxData };
    try {
      event = JSON.parse(args.rawBody) as { type?: string; data?: MuxData };
    } catch (error) {
      console.error("Mux webhook payload is not valid JSON", error);
      return { status: 400, message: "Invalid payload" };
    }

    const eventType = asString(event.type);
    const data = event.data ?? {};

    try {
      switch (eventType) {
        case "video.asset.ready": {
          const assetId = asString(data.id) ?? asString(data.asset_id);
          if (!assetId) {
            console.error("Mux asset.ready missing asset id");
            break;
          }

          const asset = await getMuxAsset(assetId);
          const playbackId =
            getPreferredPlaybackId(asset.playback_ids as MuxData["playback_ids"]) ??
            getPreferredPlaybackId(data.playback_ids);

          if (!playbackId) {
            console.error("Mux asset.ready missing playback id", { assetId });
            break;
          }

          const videoId =
            (await resolveVideoIdFromMuxRefs(ctx, {
              ...data,
              asset_id: assetId,
              upload_id: asString(data.upload_id),
              passthrough: asString(asset.passthrough) ?? asString(data.passthrough),
            })) ?? null;

          if (!videoId) {
            console.error("Could not resolve video for Mux asset.ready", { assetId });
            break;
          }

          await ctx.runMutation(internal.videos.markAsReady, {
            videoId,
            muxAssetId: assetId,
            muxPlaybackId: playbackId,
            duration:
              typeof asset.duration === "number"
                ? asset.duration
                : typeof data.duration === "number"
                  ? data.duration
                  : undefined,
            thumbnailUrl: buildMuxThumbnailUrl(playbackId),
          });

          break;
        }

        case "video.asset.errored": {
          const assetId = asString(data.id) ?? asString(data.asset_id);
          const videoId = await resolveVideoIdFromMuxRefs(ctx, {
            ...data,
            asset_id: assetId,
          });

          if (!videoId) {
            console.error("Could not resolve video for Mux asset.errored", { assetId });
            break;
          }

          await ctx.runMutation(internal.videos.markAsFailed, {
            videoId,
            uploadError: getErrorMessage(data) ?? "Mux failed to process this asset.",
          });
          break;
        }

        case "video.upload.cancelled":
        case "video.upload.errored": {
          const uploadId = asString(data.id) ?? asString(data.upload_id);
          const videoId = await resolveVideoIdFromMuxRefs(ctx, {
            ...data,
            upload_id: uploadId,
          });

          if (!videoId) {
            console.error("Could not resolve video for Mux upload failure", { uploadId });
            break;
          }

          await ctx.runMutation(internal.videos.markAsFailed, {
            videoId,
            uploadError: getErrorMessage(data) ?? "Mux upload failed or was cancelled.",
          });
          break;
        }

        default:
          console.log("Ignoring unsupported Mux webhook event", eventType);
      }
    } catch (error) {
      console.error("Mux webhook handler failed", { eventType, error });
      return { status: 500, message: "Webhook processing failed" };
    }

    return { status: 200, message: "OK" };
  },
});
