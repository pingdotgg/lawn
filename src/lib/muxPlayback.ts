export type MuxPlaybackRecovery = {
  scopeKey: string;
  playbackId: string;
  url: string;
  posterUrl: string;
  revision: number;
};

export function buildMuxPlaybackHlsUrl(playbackId: string) {
  const url = new URL(`https://stream.mux.com/${playbackId}.m3u8`);
  url.searchParams.set("max_resolution", "720p");
  return url.toString();
}

export function buildMuxPlaybackPosterUrl(playbackId: string) {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`;
}

export function selectMuxPlaybackSource({
  scopeKey,
  playbackId,
  recovery,
}: {
  scopeKey: string;
  playbackId: string | null | undefined;
  recovery: MuxPlaybackRecovery | null;
}) {
  if (!playbackId) return null;

  if (recovery?.scopeKey === scopeKey && recovery.playbackId === playbackId) {
    return {
      url: recovery.url,
      posterUrl: recovery.posterUrl,
      revision: recovery.revision,
    };
  }

  return {
    url: buildMuxPlaybackHlsUrl(playbackId),
    posterUrl: buildMuxPlaybackPosterUrl(playbackId),
    revision: 0,
  };
}

const prefetchedPlaybackIds = new Set<string>();
let hlsRuntimePromise: Promise<typeof import("hls.js")> | null = null;

export function prefetchMuxPlaybackManifest(playbackId: string) {
  if (typeof window === "undefined") return;
  if (prefetchedPlaybackIds.has(playbackId)) return;
  prefetchedPlaybackIds.add(playbackId);

  const url = buildMuxPlaybackHlsUrl(playbackId);
  fetch(url, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  }).catch(() => {
    prefetchedPlaybackIds.delete(playbackId);
    // Best effort only; route transitions should not depend on this.
  });
}

export function loadHlsRuntime() {
  if (typeof window === "undefined") return null;
  if (hlsRuntimePromise) return hlsRuntimePromise;

  hlsRuntimePromise = import("hls.js").catch((error) => {
    hlsRuntimePromise = null;
    throw error;
  });
  return hlsRuntimePromise;
}

export function prefetchHlsRuntime() {
  loadHlsRuntime()?.catch(() => {
    // Best effort only; if this fails, the player will lazy-load on demand.
  });
}
