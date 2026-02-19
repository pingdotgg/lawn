"use node";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { JobFile } from "@chunkify/chunkify/resources/files";
import type { UnwrapWebhookEvent } from "@chunkify/chunkify/resources/webhooks";
import { v } from "convex/values";
import { internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  buildChunkify720pPathPrefix,
  listChunkifyJobFiles,
  unwrapChunkifyWebhook,
} from "./chunkify";
import { BUCKET_NAME, getS3Client } from "./s3";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function stripBucketPrefix(path: string): string {
  const normalized = normalizePath(path);
  const bucketPrefix = `${BUCKET_NAME}/`;
  if (normalized.startsWith(bucketPrefix)) {
    return normalized.slice(bucketPrefix.length);
  }
  return normalized;
}

function manifestFileFrom(files: JobFile[]): JobFile | null {
  const byExtension = files.find((file) => normalizePath(file.path).endsWith(".m3u8"));
  if (byExtension) return byExtension;

  const byMimeType = files.find((file) => file.mime_type.includes("mpegurl"));
  return byMimeType ?? null;
}

function sharedDirectoryPrefix(paths: string[]): string {
  if (paths.length === 0) return "";

  const directories = paths.map((value) => {
    const normalized = normalizePath(value);
    const separatorIndex = normalized.lastIndexOf("/");
    const directory = separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : "";
    return directory.length > 0 ? directory.split("/") : [];
  });

  let prefix = [...directories[0]];
  for (let index = 1; index < directories.length; index += 1) {
    const current = directories[index];
    let matched = 0;
    while (matched < prefix.length && matched < current.length && prefix[matched] === current[matched]) {
      matched += 1;
    }
    prefix = prefix.slice(0, matched);
    if (prefix.length === 0) {
      break;
    }
  }

  return prefix.length > 0 ? `${prefix.join("/")}/` : "";
}

function relativeFromPrefix(path: string, prefix: string): string {
  const normalized = normalizePath(path);
  if (prefix && normalized.startsWith(prefix)) {
    return normalized.slice(prefix.length);
  }

  const separatorIndex = normalized.lastIndexOf("/");
  if (separatorIndex < 0) return normalized;
  return normalized.slice(separatorIndex + 1);
}

function directManifestKey(path: string, targetPrefix: string): string | null {
  const normalized = stripBucketPrefix(path);
  if (!normalized.startsWith(targetPrefix)) {
    return null;
  }
  return normalized;
}

function jobErrorMessage(event: UnwrapWebhookEvent): string {
  const maybeJob = (event.data as { job?: { error?: { message?: string } } }).job;
  const message = maybeJob?.error?.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  if (event.event === "job.cancelled") {
    return "Chunkify job was cancelled.";
  }
  return "Chunkify failed to process this video.";
}

async function copyFileToRailway(file: JobFile, destinationKey: string): Promise<void> {
  if (!file.url) {
    throw new Error(`Chunkify file is missing a signed URL: ${file.id}`);
  }

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Failed to download Chunkify file ${file.id} (${response.status})`);
  }

  const s3 = getS3Client();
  const body = Buffer.from(await response.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: destinationKey,
      Body: body,
      ContentType: file.mime_type || undefined,
    }),
  );
}

async function finalizeCompletedJob(
  ctx: ActionCtx,
  videoId: Id<"videos">,
  event: UnwrapWebhookEvent,
): Promise<void> {
  const jobData = event.data as UnwrapWebhookEvent.NotificationPayloadJobCompleted;
  const jobId = jobData.job.id;

  let files = Array.isArray(jobData.files) ? [...jobData.files] : [];
  if (files.length === 0) {
    files = await listChunkifyJobFiles(jobId);
  }
  if (files.length === 0) {
    throw new Error("Chunkify job completed without output files");
  }

  const manifestFile = manifestFileFrom(files);
  if (!manifestFile) {
    throw new Error("Chunkify job completed without an HLS manifest");
  }

  const targetPrefix = buildChunkify720pPathPrefix(videoId);
  const directMode = jobData.job.metadata?.directStorage === "true";

  let manifestKey: string | null = null;
  if (directMode) {
    manifestKey = directManifestKey(manifestFile.path, targetPrefix);
  }

  if (!manifestKey) {
    const prefix = sharedDirectoryPrefix(files.map((file) => file.path));

    for (const file of files) {
      const relativePath = relativeFromPrefix(file.path, prefix).replace(/^\/+/, "");
      const destinationKey = `${targetPrefix}${relativePath}`;
      await copyFileToRailway(file, destinationKey);

      if (file.id === manifestFile.id) {
        manifestKey = destinationKey;
      }
    }
  }

  if (!manifestKey) {
    throw new Error("Could not resolve destination HLS manifest key");
  }

  const duration =
    typeof manifestFile.duration === "number" && manifestFile.duration > 0
      ? manifestFile.duration
      : undefined;

  await ctx.runMutation(internal.videos.markAsReady, {
    videoId,
    playback720ManifestKey: manifestKey,
    duration,
    thumbnailUrl: undefined,
  });
}

function resolveJobId(event: UnwrapWebhookEvent): string | null {
  if (!event.event.startsWith("job.")) {
    return null;
  }

  const maybeJob = (event.data as { job?: { id?: string } }).job;
  if (typeof maybeJob?.id !== "string" || maybeJob.id.length === 0) {
    return null;
  }
  return maybeJob.id;
}

export const processWebhook = internalAction({
  args: {
    rawBody: v.string(),
    headers: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.object({
    status: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    let event: UnwrapWebhookEvent;
    try {
      event = unwrapChunkifyWebhook(args.rawBody, args.headers ?? {});
    } catch (error) {
      console.error("Chunkify webhook signature verification failed", error);
      return { status: 401, message: "Invalid signature" };
    }

    const jobId = resolveJobId(event);
    if (!jobId) {
      return { status: 200, message: "Ignored" };
    }

    const resolved = await ctx.runQuery(internal.videos.getVideoByTranscodeJobId, {
      transcodeJobId: jobId,
    });

    if (!resolved?.videoId) {
      return { status: 200, message: "No matching video" };
    }

    const video = await ctx.runQuery(internal.videos.getVideoInternal, {
      videoId: resolved.videoId,
    });

    if (!video) {
      return { status: 200, message: "Video missing" };
    }

    if (video.transcodeJobId && video.transcodeJobId !== jobId) {
      return { status: 200, message: "Stale webhook" };
    }

    try {
      if (event.event === "job.completed") {
        if (video.transcodeStatus === "ready" && video.playback720ManifestKey) {
          return { status: 200, message: "Already processed" };
        }

        await finalizeCompletedJob(ctx, resolved.videoId, event);
        return { status: 200, message: "OK" };
      }

      if (event.event === "job.failed" || event.event === "job.cancelled") {
        if (video.status === "ready") {
          return { status: 200, message: "Ignored late failure" };
        }

        await ctx.runMutation(internal.videos.markAsFailed, {
          videoId: resolved.videoId,
          transcodeError: jobErrorMessage(event),
        });

        return { status: 200, message: "OK" };
      }

      return { status: 200, message: "Ignored" };
    } catch (error) {
      console.error("Chunkify webhook handler failed", {
        event: event.event,
        jobId,
        videoId: resolved.videoId,
        error,
      });

      await ctx.runMutation(internal.videos.markAsFailed, {
        videoId: resolved.videoId,
        transcodeError: "Chunkify webhook processing failed.",
      });

      return { status: 500, message: "Webhook processing failed" };
    }
  },
});
