"use node";

import Mux from "@mux/mux-node";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedMux: Mux | null = null;

export function getMuxClient(): Mux {
  if (cachedMux) return cachedMux;

  cachedMux = new Mux({
    tokenId: requireEnv("MUX_TOKEN_ID"),
    tokenSecret: requireEnv("MUX_TOKEN_SECRET"),
  });

  return cachedMux;
}

export async function createMuxAssetFromInputUrl(videoId: string, inputUrl: string) {
  const mux = getMuxClient();
  return await mux.video.assets.create({
    inputs: [{ url: inputUrl }],
    playback_policy: ["public"],
    mp4_support: "standard",
    passthrough: videoId,
  });
}

export async function getMuxAsset(assetId: string) {
  const mux = getMuxClient();
  return await mux.video.assets.retrieve(assetId);
}

export async function deleteMuxAsset(assetId: string) {
  const mux = getMuxClient();
  await mux.video.assets.delete(assetId);
}

export function buildMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function buildMuxThumbnailUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`;
}

export function verifyMuxWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) {
    throw new Error("Missing mux-signature header");
  }

  const mux = getMuxClient();
  const webhookSecret = requireEnv("MUX_WEBHOOK_SECRET");

  mux.webhooks.verifySignature(rawBody, {
    "mux-signature": signature,
  }, webhookSecret);
}
