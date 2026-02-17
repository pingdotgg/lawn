export function buildMuxPlaybackHlsUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

const prefetchedPlaybackIds = new Set<string>();
let hlsRuntimePrefetched = false;

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
    // Best effort only; route transitions should not depend on this.
  });
}

export function prefetchHlsRuntime() {
  if (typeof window === "undefined") return;
  if (hlsRuntimePrefetched) return;
  hlsRuntimePrefetched = true;

  import("hls.js").catch(() => {
    // Best effort only; if this fails, the player will lazy-load on demand.
  });
}
