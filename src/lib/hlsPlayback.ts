const prefetchedManifestUrls = new Set<string>();
let hlsRuntimePrefetched = false;
let hlsRuntimeWarmupInstalled = false;
let hlsRuntimeWarmupCompleted = false;

export function prefetchHlsManifest(manifestUrl: string) {
  if (typeof window === "undefined") return;
  if (!manifestUrl.includes(".m3u8")) return;
  if (prefetchedManifestUrls.has(manifestUrl)) return;
  prefetchedManifestUrls.add(manifestUrl);

  fetch(manifestUrl, {
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

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

export function installHlsRuntimeWarmup() {
  if (typeof window === "undefined") return () => {};
  if (hlsRuntimeWarmupCompleted || hlsRuntimeWarmupInstalled) return () => {};

  hlsRuntimeWarmupInstalled = true;
  const idleWindow = window as IdleWindow;
  let idleCallbackId: number | null = null;
  let timeoutId: number | null = null;

  const cleanup = () => {
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("touchstart", onInteract);
    window.removeEventListener("keydown", onInteract);

    if (idleCallbackId !== null && idleWindow.cancelIdleCallback) {
      idleWindow.cancelIdleCallback(idleCallbackId);
      idleCallbackId = null;
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    hlsRuntimeWarmupInstalled = false;
  };

  const warm = () => {
    if (hlsRuntimeWarmupCompleted) return;
    hlsRuntimeWarmupCompleted = true;
    cleanup();
    prefetchHlsRuntime();
  };

  function onInteract() {
    warm();
  }

  window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
  window.addEventListener("touchstart", onInteract, { once: true, passive: true });
  window.addEventListener("keydown", onInteract, { once: true });

  if (idleWindow.requestIdleCallback) {
    idleCallbackId = idleWindow.requestIdleCallback(warm, { timeout: 1500 });
  } else {
    timeoutId = window.setTimeout(warm, 1200);
  }

  return cleanup;
}
