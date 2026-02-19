"use node";

import Chunkify from "@chunkify/chunkify";
import type { JobCreateParams } from "@chunkify/chunkify/resources/jobs/jobs";
import type { StorageCreateParams } from "@chunkify/chunkify/resources/storages";
import type { UnwrapWebhookEvent } from "@chunkify/chunkify/resources/webhooks";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const CHUNKIFY_AWS_REGIONS = new Set([
  "us-east-1",
  "us-east-2",
  "us-central-1",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-north-1",
  "ap-east-1",
  "ap-east-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
] as const);

type ChunkifyAwsRegion = StorageCreateParams.Aws["region"];

function normalizeAwsRegion(input: string | undefined): ChunkifyAwsRegion {
  if (input && CHUNKIFY_AWS_REGIONS.has(input as ChunkifyAwsRegion)) {
    return input as ChunkifyAwsRegion;
  }
  return "us-east-1";
}

let cachedChunkifyClient: Chunkify | null = null;

export function getChunkifyClient(): Chunkify {
  if (cachedChunkifyClient) return cachedChunkifyClient;

  cachedChunkifyClient = new Chunkify({
    projectAccessToken: requireEnv("CHUNKIFY_TOKEN"),
    webhookKey: process.env.CHUNKIFY_WEBHOOK_SECRET ?? null,
  });

  return cachedChunkifyClient;
}

function normalizeWebhookHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function unwrapChunkifyWebhook(
  rawBody: string,
  headers: Headers | Record<string, string>,
): UnwrapWebhookEvent {
  const client = getChunkifyClient();
  const webhookKey = requireEnv("CHUNKIFY_WEBHOOK_SECRET");

  return client.webhooks.unwrap(rawBody, {
    headers: normalizeWebhookHeaders(headers),
    key: webhookKey,
  });
}

export function buildChunkify720pPathPrefix(videoId: string): string {
  return `videos/${videoId}/playback/720p-h264/`;
}

export async function createChunkifySourceFromUrl(
  sourceUrl: string,
  metadata?: Record<string, string>,
): Promise<{ id: string }> {
  const client = getChunkifyClient();
  const source = await client.sources.create({
    url: sourceUrl,
    metadata,
  });

  return { id: source.id };
}

export async function createChunkify720pJob(params: {
  sourceId: string;
  videoId: string;
  storageId?: string;
  storagePath?: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string }> {
  const client = getChunkifyClient();

  const body: JobCreateParams = {
    source_id: params.sourceId,
    format: {
      id: "hls_h264",
      height: 720,
      hls_segment_type: "fmp4",
      hls_time: 6,
      profilev: "high",
      preset: "medium",
    },
    metadata: {
      videoId: params.videoId,
      ...params.metadata,
    },
  };

  if (params.storageId || params.storagePath) {
    body.storage = {
      id: params.storageId,
      path: params.storagePath,
    };
  }

  const job = await client.jobs.create(body);
  return { id: job.id };
}

export async function listChunkifyJobFiles(jobId: string) {
  const client = getChunkifyClient();
  const response = await client.jobs.files.list(jobId);
  return response.data;
}

export async function resolveChunkifyDirectStorageId(): Promise<string | null> {
  if (process.env.CHUNKIFY_DIRECT_STORAGE_ID) {
    return process.env.CHUNKIFY_DIRECT_STORAGE_ID;
  }

  if (process.env.CHUNKIFY_TRY_DIRECT_STORAGE === "false") {
    return null;
  }

  const accessKeyId = process.env.RAILWAY_ACCESS_KEY_ID;
  const secretAccessKey = process.env.RAILWAY_SECRET_ACCESS_KEY;
  const bucket = process.env.RAILWAY_BUCKET_NAME;
  if (!accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const client = getChunkifyClient();
  const desiredRegion = normalizeAwsRegion(process.env.RAILWAY_REGION);

  try {
    const existing = await client.storages.list();
    const match = existing.data.find((storage) => {
      return (
        storage.provider === "aws" &&
        storage.bucket === bucket &&
        storage.region === desiredRegion
      );
    });

    if (match) {
      return match.id;
    }
  } catch (error) {
    console.error("Failed to list Chunkify storages", error);
    return null;
  }

  try {
    const created = await client.storages.create({
      storage: {
        provider: "aws",
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        bucket,
        region: desiredRegion,
        public: false,
      },
    });
    return created.id;
  } catch (error) {
    console.warn("Chunkify direct storage setup failed. Falling back to copy mode.", {
      bucket,
      region: desiredRegion,
      error,
    });
    return null;
  }
}
