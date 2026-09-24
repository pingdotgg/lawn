// Thumbnail failure must never prevent uploading the original file.
export function extractVideoThumbnail(file: File, signal: AbortSignal): Promise<Blob | null> {
  if (signal.aborted || typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let sourceUrl: string | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let settled = false;
    let capturing = false;
    const finish = (blob: Blob | null = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      video.onloadedmetadata = video.onloadeddata = video.onseeked = video.onerror = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (canvas) canvas.width = canvas.height = 0;
      resolve(blob);
    };
    const abort = () => finish();
    const timeout = setTimeout(abort, 10_000);
    signal.addEventListener("abort", abort, { once: true });
    const capture = () => {
      if (settled || capturing || video.readyState < 2) return;
      capturing = true;
      try {
        if (!video.videoWidth || !video.videoHeight) return finish();
        canvas = document.createElement("canvas");
        const scale = Math.min(1, 640 / video.videoWidth, 360 / video.videoHeight);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return finish();
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            finish(blob);
          },
          "image/jpeg",
          0.8,
        );
      } catch {
        finish();
      }
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = abort;
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return finish();
      try {
        video.currentTime = Math.min(1, video.duration / 2);
      } catch {
        finish();
      }
    };
    video.onseeked = capture;
    // Some browsers decode the seek target after firing seeked.
    video.onloadeddata = () => {
      if (!video.seeking && video.currentTime > 0) capture();
    };
    try {
      sourceUrl = URL.createObjectURL(file);
      video.src = sourceUrl;
      video.load();
    } catch {
      finish();
    }
  });
}
