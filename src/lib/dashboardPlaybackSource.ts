export type DashboardPlaybackSource = "mux720" | "original";

export function shouldRequestDashboardOriginalPlayback({
  preferredSource,
  videoStatus,
  hasOriginalFile,
}: {
  preferredSource: DashboardPlaybackSource;
  videoStatus: string | undefined;
  hasOriginalFile: boolean;
}) {
  if (!hasOriginalFile || videoStatus === "uploading" || videoStatus === "failed") {
    return false;
  }

  return videoStatus === "processing" || preferredSource === "original";
}

export function selectDashboardOriginalPlaybackUrl({
  videoId,
  attempt,
  playback,
}: {
  videoId: string | null | undefined;
  attempt: number;
  playback: {
    videoId: string;
    attempt: number;
    url: string;
  } | null;
}) {
  if (!videoId || playback?.videoId !== videoId || playback.attempt !== attempt) {
    return null;
  }

  return playback.url;
}

export function selectDashboardPlaybackUrl({
  preferredSource,
  muxPlaybackReady,
  muxUrl,
  originalUrl,
}: {
  preferredSource: DashboardPlaybackSource;
  muxPlaybackReady: boolean;
  muxUrl: string | null;
  originalUrl: string | null;
}) {
  if (preferredSource === "original") {
    // Keep the current Mux stream attached while a lazily requested original
    // URL is in flight. Swapping only once the URL arrives avoids a black flash.
    return originalUrl ?? muxUrl;
  }

  // Once Mux is ready, wait for its session instead of briefly starting the
  // original and swapping sources when the session request completes.
  if (muxPlaybackReady) {
    return muxUrl;
  }

  // While Mux is still processing, the original remains the fastest available
  // way into the video.
  return originalUrl ?? muxUrl;
}
