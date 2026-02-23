"use node";

import Mux from "@mux/mux-node";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizePrivateKey(value: string): string {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function getMuxJwtCredentials(): { keyId: string; keySecret: string } {
  const keyId = readEnv(
    "MUX_SIGNING_KEY",
    "MUX_SIGNING_KEY_ID",
  );
  if (!keyId) {
    throw new Error(
      "Missing required environment variable: MUX_SIGNING_KEY (or legacy MUX_SIGNING_KEY_ID)",
    );
  }

  const keySecret = readEnv(
    "MUX_PRIVATE_KEY",
    "MUX_SIGNING_PRIVATE_KEY",
  );
  if (!keySecret) {
    throw new Error(
      "Missing required environment variable: MUX_PRIVATE_KEY (or legacy MUX_SIGNING_PRIVATE_KEY)",
    );
  }

  return { keyId, keySecret: normalizePrivateKey(keySecret) };
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
    playback_policies: ["public"],
    video_quality: "basic",
    // Mux currently supports 1080p as the lowest adaptive streaming max tier.
    max_resolution_tier: "1080p",
    mp4_support: "none",
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

export async function createSignedPlaybackId(assetId: string) {
  const mux = getMuxClient();
  return await mux.video.assets.createPlaybackId(assetId, {
    policy: "signed",
  });
}

export async function createPublicPlaybackId(assetId: string) {
  const mux = getMuxClient();
  return await mux.video.assets.createPlaybackId(assetId, {
    policy: "public",
  });
}

export async function deletePlaybackId(assetId: string, playbackId: string) {
  const mux = getMuxClient();
  await mux.video.assets.deletePlaybackId(assetId, playbackId);
}

export function buildMuxPlaybackUrl(playbackId: string, token?: string): string {
  const url = new URL(`https://stream.mux.com/${playbackId}.m3u8`);
  // Force a single 720p delivery profile in the playback manifest.
  url.searchParams.set("min_resolution", "720p");
  url.searchParams.set("max_resolution", "720p");
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

export function buildMuxThumbnailUrl(playbackId: string, token?: string): string {
  const base = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`;
  if (!token) return base;
  return `${base}&token=${encodeURIComponent(token)}`;
}

export async function signPlaybackToken(playbackId: string, expiration = "1h") {
  const mux = getMuxClient();
  const credentials = getMuxJwtCredentials();
  return await mux.jwt.signPlaybackId(playbackId, {
    keyId: credentials.keyId,
    keySecret: credentials.keySecret,
    type: "video",
    expiration,
  });
}

export async function signThumbnailToken(playbackId: string, expiration = "1h") {
  const mux = getMuxClient();
  const credentials = getMuxJwtCredentials();
  return await mux.jwt.signPlaybackId(playbackId, {
    keyId: credentials.keyId,
    keySecret: credentials.keySecret,
    type: "thumbnail",
    expiration,
  });
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
