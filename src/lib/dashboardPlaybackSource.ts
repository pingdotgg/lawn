export type DashboardPlaybackSource = "mux720" | "original";

export function selectDashboardPlaybackPreferenceAfterOriginalLoad({
  currentPreference,
  startedWhileProcessing,
  originalUrl,
}: {
  currentPreference: DashboardPlaybackSource | null;
  startedWhileProcessing: boolean;
  originalUrl: string | null;
}): DashboardPlaybackSource | null {
  if (currentPreference || !startedWhileProcessing || !originalUrl) {
    return currentPreference;
  }

  return "original";
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
