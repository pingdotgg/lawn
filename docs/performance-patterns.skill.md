# Performance & UX Patterns from lawn (Theo's Video Review Platform)

> A comprehensive catalog of patterns that make lawn feel instant. Extracted from the actual codebase for reuse in other projects.

---

## Table of Contents

1. [Intent-Based Route Prewarming](#1-intent-based-route-prewarming)
2. [Two-Stage Data Prefetching](#2-two-stage-data-prefetching)
3. [Multi-Layer Network Prefetching](#3-multi-layer-network-prefetching)
4. [Conditional Query Skipping (Waterfall Prevention)](#4-conditional-query-skipping-waterfall-prevention)
5. [HLS Runtime Lazy-Load with Prefetch](#5-hls-runtime-lazy-load-with-prefetch)
6. [Theme Flash Prevention](#6-theme-flash-prevention)
7. [SPA Shell with Prerendered Marketing Pages](#7-spa-shell-with-prerendered-marketing-pages)
8. [Upload Manager with Rolling Speed Metrics](#8-upload-manager-with-rolling-speed-metrics)
9. [Presence System with sendBeacon Disconnect](#9-presence-system-with-sendbeacon-disconnect)
10. [Video Player State Architecture](#10-video-player-state-architecture)
11. [Composable Authorization Guards](#11-composable-authorization-guards)
12. [Separated Route Data Files](#12-separated-route-data-files)
13. [Memoization Discipline](#13-memoization-discipline)
14. [Keyboard-First Video Controls](#14-keyboard-first-video-controls)
15. [Architecture Overview](#15-architecture-overview)

---

## 1. Intent-Based Route Prewarming

**The single biggest reason lawn feels instant.** When a user hovers over a link, the app starts fetching data for the destination route *before* they click. By the time they click, the data is already there.

### The Hook

```typescript
// useRoutePrewarmIntent.ts
type PrewarmFn = () => void | Promise<void>;

export function useRoutePrewarmIntent(
  prewarmFn: PrewarmFn,
  options: { debounceMs?: number } = {},
): RoutePrewarmIntentHandlers {
  const prewarmRef = useRef(prewarmFn);
  prewarmRef.current = prewarmFn;

  const controller = useMemo(
    () => createRoutePrewarmIntent(() => prewarmRef.current(), options),
    [options.debounceMs],
  );

  useEffect(() => () => controller.cancel(), [controller]);

  return controller.handlers;
}

function createRoutePrewarmIntent(prewarmFn, options = {}) {
  const debounceMs = options.debounceMs ?? 120; // 120ms debounce
  let timer;

  const cancel = () => { clearTimeout(timer); timer = undefined; };
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      Promise.resolve(prewarmFn()).catch(console.warn);
    }, debounceMs);
  };

  return {
    handlers: {
      onMouseEnter: schedule,
      onFocus: schedule,
      onTouchStart: schedule,  // Mobile support
      onMouseLeave: cancel,
      onBlur: cancel,
    },
    cancel,
  };
}
```

### Usage

```tsx
function VideoCard({ video, teamSlug, projectId }) {
  const convex = useConvex();

  const prewarmHandlers = useRoutePrewarmIntent(() => {
    // Prewarm the route data
    prewarmVideo(convex, { teamSlug, projectId, videoId: video._id });
    // Also prefetch the video player runtime
    prefetchHlsRuntime();
    // And the video manifest
    if (video.muxPlaybackId) {
      prefetchMuxPlaybackManifest(video.muxPlaybackId);
    }
  });

  return (
    <div onClick={navigateToVideo} {...prewarmHandlers}>
      {/* card content */}
    </div>
  );
}
```

### Why This Works

- **120ms debounce** prevents prefetching on accidental mouse passes
- **Cancel on leave** prevents wasted requests when the user moves away
- **Touch support** makes it work on mobile (fires on first tap in touch events)
- **Non-blocking** — all prewarm failures are caught and logged, never block navigation

### When to Use

Apply to any interactive element (cards, links, buttons) that navigates to a data-heavy page. The heavier the destination page, the bigger the win.

---

## 2. Two-Stage Data Prefetching

Not all data for a route can be fetched in parallel. Some queries depend on the result of others. lawn solves this with a two-stage prewarm.

### The Pattern

```typescript
// -team.data.ts
export async function prewarmTeam(convex, params: { teamSlug: string }) {
  // STAGE 1: Fire the essential query immediately
  prewarmSpecs(convex, getTeamEssentialSpecs(params));

  try {
    // STAGE 2: Await the result, then prewarm dependent queries
    const context = await convex.query(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
    });

    if (!context?.team?._id) return;

    prewarmSpecs(convex, [
      makeRouteQuerySpec(api.projects.list, { teamId: context.team._id }),
      makeRouteQuerySpec(api.billing.getTeamBilling, { teamId: context.team._id }),
    ]);
  } catch (error) {
    console.warn("Team dependent prewarm failed", error);
  }
}
```

### The Deduplication Layer

```typescript
const PREWARM_DEBOUNCE_MS = 120;   // Debounce intent triggers
const PREWARM_EXTEND_MS = 8_000;   // Keep subscription alive 8s after prewarm
const PREWARM_DEDUPE_MS = 3_000;   // Don't re-prewarm within 3s window

const lastPrewarmedAt = new Map<string, number>();

export function prewarmSpecs(convex, specs, options = {}) {
  const dedupeMs = options.dedupeMs ?? PREWARM_DEDUPE_MS;
  const now = Date.now();

  for (const spec of specs) {
    const previous = lastPrewarmedAt.get(spec.key);
    if (previous !== undefined && now - previous < dedupeMs) {
      continue; // Already prewarmed recently, skip
    }
    lastPrewarmedAt.set(spec.key, now);

    try {
      convex.prewarmQuery({
        query: spec.query,
        args: spec.args,
        extendSubscriptionFor: options.extendSubscriptionFor ?? PREWARM_EXTEND_MS,
      });
    } catch (error) {
      console.warn("Prewarm failed", { key: spec.key, error });
    }
  }
}
```

### Key Insight

The `extendSubscriptionFor: 8_000` is critical. It tells Convex "keep this subscription alive for 8 more seconds even if no component is using it yet." This bridges the gap between hover-prewarm and the actual navigation mounting the component.

### Adapting for React Query / SWR

```typescript
// React Query equivalent
async function prewarmTeam(queryClient, params) {
  // Stage 1
  queryClient.prefetchQuery({
    queryKey: ['workspace', params.teamSlug],
    queryFn: () => fetchWorkspace(params.teamSlug),
    staleTime: 8_000,
  });

  // Stage 2
  try {
    const context = await queryClient.fetchQuery({
      queryKey: ['workspace', params.teamSlug],
      queryFn: () => fetchWorkspace(params.teamSlug),
    });

    if (!context?.team?._id) return;

    queryClient.prefetchQuery({
      queryKey: ['projects', context.team._id],
      queryFn: () => fetchProjects(context.team._id),
      staleTime: 8_000,
    });
  } catch {}
}
```

---

## 3. Multi-Layer Network Prefetching

lawn prefetches at 4 distinct layers, each solving a different latency bottleneck:

### Layer 1: DNS Prefetch + Preconnect (HTML head, on page load)

```typescript
// __root.tsx — head links
links: [
  { rel: "preconnect", href: "https://stream.mux.com", crossOrigin: "anonymous" },
  { rel: "preconnect", href: "https://image.mux.com", crossOrigin: "anonymous" },
  { rel: "dns-prefetch", href: "//stream.mux.com" },
  { rel: "dns-prefetch", href: "//image.mux.com" },
]
```

**Why both?** `preconnect` does DNS + TCP + TLS. `dns-prefetch` is a fallback for browsers that don't support preconnect. Costs nothing, saves 100-300ms on first media request.

### Layer 2: HLS Runtime Prefetch (on hover, before playback)

```typescript
let hlsRuntimePrefetched = false;

export function prefetchHlsRuntime() {
  if (typeof window === "undefined") return;
  if (hlsRuntimePrefetched) return;
  hlsRuntimePrefetched = true;

  // Dynamic import fires the chunk download but doesn't block anything
  import("hls.js").catch(() => {});
}
```

The hls.js library is ~200KB. By prefetching it on hover, the video player doesn't wait for a cold dynamic import.

### Layer 3: Video Manifest Prefetch (on hover, per video)

```typescript
const prefetchedPlaybackIds = new Set<string>();

export function prefetchMuxPlaybackManifest(playbackId: string) {
  if (typeof window === "undefined") return;
  if (prefetchedPlaybackIds.has(playbackId)) return;
  prefetchedPlaybackIds.add(playbackId);

  const url = `https://stream.mux.com/${playbackId}.m3u8`;
  fetch(url, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",  // Browser caches the response
  }).catch(() => {});
}
```

### Layer 4: Route Data Prewarm (on hover, via Convex)

See patterns #1 and #2 above.

### The Combined Effect on Hover

When a user hovers a video card, all 4 layers fire simultaneously:
1. DNS/TCP is already warm (from page load)
2. hls.js chunk starts downloading
3. `.m3u8` manifest starts downloading
4. Video metadata + comments start loading from Convex

By the time they click, navigate, and the video player mounts — everything is ready.

---

## 4. Conditional Query Skipping (Waterfall Prevention)

lawn uses a `"skip"` pattern to handle dependent queries without waterfalls:

```typescript
export function useVideoData(params) {
  // Query 1: Always fires immediately
  const context = useQuery(api.workspace.resolveContext, {
    teamSlug: params.teamSlug,
    projectId: params.projectId,
    videoId: params.videoId,
  });

  const resolvedVideoId = context?.video?._id;

  // Queries 2-4: Skip until context resolves, then fire in parallel
  const video = useQuery(
    api.videos.get,
    resolvedVideoId ? { videoId: resolvedVideoId } : "skip",
  );
  const comments = useQuery(
    api.comments.list,
    resolvedVideoId ? { videoId: resolvedVideoId } : "skip",
  );
  const commentsThreaded = useQuery(
    api.comments.getThreaded,
    resolvedVideoId ? { videoId: resolvedVideoId } : "skip",
  );

  return { context, video, comments, commentsThreaded };
}
```

### Why This Matters

Without `"skip"`, you'd either:
- Fetch everything sequentially (waterfall)
- Fetch with potentially stale IDs (bugs)

With `"skip"`, dependent queries stay dormant until their input is available, then fire in parallel. React Query equivalent: `enabled: !!resolvedVideoId`.

---

## 5. HLS Runtime Lazy-Load with Prefetch

The video player dynamically imports hls.js only when needed, with graceful fallback:

```typescript
const attachSource = async () => {
  // Clean up previous HLS instance
  if (hlsRef.current) {
    hlsRef.current.destroy();
    hlsRef.current = null;
  }

  if (isHlsSource(src)) {
    // Dynamic import — already cached if prefetchHlsRuntime() ran
    const { default: Hls } = await import("hls.js");
    if (cancelled) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true }); // Offload parsing to Web Worker
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Build quality options from manifest levels
        const dedupedByHeight = new Map();
        hls.levels.forEach((levelInfo, levelIndex) => {
          const height = levelInfo.height;
          if (!height) return;
          const existing = dedupedByHeight.get(height);
          if (!existing || levelInfo.bitrate >= existing.bitrate) {
            dedupedByHeight.set(height, { level: levelIndex, bitrate: levelInfo.bitrate });
          }
        });
        setQualityOptions(/* sorted array */);
      });
    } else {
      // Safari native HLS fallback
      video.src = src;
    }
  } else {
    video.src = src;
  }
};

// Outer try-catch for the entire flow
attachSource().catch(() => {
  video.src = src; // Ultimate fallback
});
```

### Key Details

- `enableWorker: true` — HLS manifest parsing happens in a Web Worker, keeping the main thread free
- Quality deduplication by height — prevents showing "720p" twice when there are multiple 720p bitrate variants
- Triple fallback: HLS.js → native HLS (Safari) → direct src
- The `cancelled` flag prevents race conditions when the component unmounts during the async import

---

## 6. Theme Flash Prevention

lawn prevents the "flash of wrong theme" with an inline script that runs before React hydrates:

```typescript
function RootDocument({ children }) {
  const themeInitScript = `
    (() => {
      try {
        const stored = localStorage.getItem("lawn-theme");
        if (stored === "light" || stored === "dark") {
          document.documentElement.setAttribute("data-theme", stored);
          return;
        }
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } catch {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* App renders after theme is set */}
        <ConvexClientProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Why This Works

The `<script>` is synchronous and runs before the browser paints. It reads localStorage, sets the `data-theme` attribute, and the CSS variables are already correct when the first paint happens. `suppressHydrationWarning` prevents React from complaining about the server/client mismatch on the `data-theme` attribute.

---

## 7. SPA Shell with Prerendered Marketing Pages

lawn uses a hybrid approach: marketing pages are prerendered at build time, while the app is a full SPA.

```typescript
// vite.config.ts
tanstackStart({
  srcDirectory: "app",
  spa: {
    enabled: true,
    maskPath: "/mono",
    prerender: {
      outputPath: "/_shell",
      crawlLinks: false,
    },
  },
  prerender: {
    enabled: true,
    autoStaticPathsDiscovery: false,
    crawlLinks: false,
  },
  pages: [
    { path: "/" },
    { path: "/compare/frameio" },
    { path: "/compare/wipster" },
    { path: "/for/video-editors" },
    { path: "/for/agencies" },
    { path: "/pricing" },
  ],
})
```

```json
// vercel.json
{
  "buildCommand": "bun run build:vercel",
  "outputDirectory": "dist/client",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/_shell.html" }
  ]
}
```

### The Strategy

- **Marketing pages** (`/`, `/pricing`, `/compare/*`, `/for/*`) are prerendered as static HTML at build time — instant first paint, great SEO
- **App routes** (`/dashboard/*`, `/watch/*`, `/share/*`) fall through to `_shell.html` — a lightweight SPA shell that loads the client-side router
- **Router config** adds `defaultPreload: "intent"` and `scrollRestoration: true` for smooth in-app navigation

---

## 8. Upload Manager with Rolling Speed Metrics

The upload manager uses XHR (not fetch) for progress tracking, with a rolling-average speed calculation:

```typescript
export function useVideoUploadManager() {
  const [uploads, setUploads] = useState<ManagedUploadItem[]>([]);

  const uploadFilesToProject = useCallback(async (projectId, files) => {
    for (const file of files) {
      const abortController = new AbortController();

      // 1. Create video record in DB (status: "uploading")
      const videoId = await createVideo({ projectId, title, fileSize, contentType });

      // 2. Get presigned S3 URL (direct browser-to-S3, bypasses server)
      const { url } = await getUploadUrl({ videoId, filename, fileSize, contentType });

      // 3. Upload with XHR for progress tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let lastTime = Date.now();
        let lastLoaded = 0;
        const recentSpeeds = []; // Rolling window of 5

        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) return;

          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          const bytesDelta = event.loaded - lastLoaded;

          if (timeDelta > 0.1) { // Only sample every 100ms
            const speed = bytesDelta / timeDelta;
            recentSpeeds.push(speed);
            if (recentSpeeds.length > 5) recentSpeeds.shift(); // Keep last 5
            lastTime = now;
            lastLoaded = event.loaded;
          }

          const avgSpeed = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
          const remaining = event.total - event.loaded;
          const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : null;

          updateUpload(uploadId, {
            progress: Math.round((event.loaded / event.total) * 100),
            bytesPerSecond: avgSpeed,
            estimatedSecondsRemaining: eta,
          });
        });

        // Wire abort controller to XHR
        abortController.signal.addEventListener("abort", () => xhr.abort());

        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      // 4. Mark complete, auto-remove after 3s
      await markUploadComplete({ videoId });
      setTimeout(() => removeUpload(uploadId), 3000);
    }
  }, []);

  return { uploads, uploadFilesToProject, cancelUpload };
}
```

### Key Details

- **XHR over fetch** — `fetch()` doesn't support upload progress events. XHR does.
- **Rolling average of 5 samples** — Smooths out speed fluctuations. More stable ETA.
- **100ms sampling threshold** — Prevents noise from tiny time deltas.
- **Presigned S3 URLs** — Files go directly from browser to S3. No server bandwidth cost. 1-hour expiration.
- **AbortController bridge** — Cancellation propagates from React state to the XHR.
- **Auto-remove after 3s** — Completed uploads disappear from the UI after a brief confirmation period.

---

## 9. Presence System with sendBeacon Disconnect

lawn shows who's watching a video in real-time, with a clever disconnect mechanism:

```typescript
export function useVideoPresence({ videoId, enabled, shareToken, intervalMs = 15_000 }) {
  const convex = useConvex();
  const heartbeat = useMutation(api.videoPresence.heartbeat);
  const disconnect = useMutation(api.videoPresence.disconnect);

  // Stable client ID persisted in localStorage
  const [clientId] = useState(() => {
    const existing = localStorage.getItem("lawn.presence.client_id");
    if (existing) return existing;
    const id = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem("lawn.presence.client_id", id);
    return id;
  });

  useEffect(() => {
    if (!enabled || !videoId || !clientId) return;

    let active = true;
    const sessionId = crypto.randomUUID();

    const runHeartbeat = async () => {
      const result = await heartbeat({ videoId, sessionId, clientId, interval: intervalMs });
      if (!active) return;
      sessionTokenRef.current = result.sessionToken;
    };

    // The key pattern: sendBeacon for reliable disconnect
    const handleBeforeUnload = () => {
      const sessionToken = sessionTokenRef.current;
      if (!sessionToken) return;

      const payload = JSON.stringify({
        path: "videoPresence:disconnect",
        args: { sessionToken },
      });

      // sendBeacon survives page close — fetch/XHR would be cancelled
      navigator.sendBeacon(
        `${convex.url}/api/mutation`,
        new Blob([payload], { type: "application/json" }),
      );
    };

    void runHeartbeat();
    const intervalId = setInterval(() => void runHeartbeat(), intervalMs);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also try graceful disconnect during SPA navigation
      if (sessionTokenRef.current) {
        void disconnect({ sessionToken: sessionTokenRef.current }).catch(() => {});
      }
    };
  }, [clientId, videoId, enabled, intervalMs]);

  // Real-time watcher list
  const state = useQuery(api.videoPresence.list, roomToken ? { roomToken } : "skip");

  const watchers = useMemo(() =>
    (state ?? [])
      .filter((w) => w.online)
      .map((w) => ({
        userId: w.userId,
        displayName: w.data?.displayName ?? "Member",
        avatarUrl: w.data?.avatarUrl,
      })),
    [state],
  );

  return { watchers, isLoading: roomToken !== null && state === undefined };
}
```

### Why sendBeacon

When a user closes the tab, `fetch()` and `XHR` requests are cancelled by the browser. `navigator.sendBeacon()` is specifically designed to survive page unload — it queues the request and the browser sends it even after the page is gone. This means presence status is cleaned up reliably.

---

## 10. Video Player State Architecture

The video player (~1100 lines) manages complex state with a disciplined ref/state split:

### The Principle: Refs for Internal State, useState for Render State

```typescript
// Refs — things that drive logic but don't need re-renders
const hlsRef = useRef<Hls | null>(null);
const hideControlsTimeoutRef = useRef<number | null>(null);
const wasPlayingBeforeScrubRef = useRef(false);
const scrubTimeRef = useRef(0);
const volumeBeforeMuteRef = useRef(1);
const isPlayingRef = useRef(false);           // Shadow of isPlaying for callbacks
const isScrubbingRef = useRef(false);         // Shadow of isScrubbing for callbacks
const resumeTimeOnSourceChangeRef = useRef<number | null>(null);

// State — things that drive UI rendering
const [duration, setDuration] = useState(0);
const [currentTime, setCurrentTime] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
const [isMediaReady, setIsMediaReady] = useState(false);
const [isBuffering, setIsBuffering] = useState(false);
const [controlsVisible, setControlsVisible] = useState(true);
```

### The Loading State Blur

While the video loads, lawn shows the poster image with a blur effect — communicates "loading" without a jarring skeleton:

```tsx
{!isMediaReady && (
  <div className="pointer-events-none absolute inset-0 z-[5]">
    {poster ? (
      <img src={poster} alt="" className="h-full w-full object-cover blur-[4px]" />
    ) : (
      <div className="h-full w-full bg-zinc-900" />
    )}
    <div className="absolute inset-0 bg-black/40" />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      <p className="text-sm text-white/85">Loading stream...</p>
    </div>
  </div>
)}
```

### Auto-Hide Controls with Activity Detection

```typescript
const showControls = useCallback(() => {
  setControlsVisible(true);
  if (hideControlsTimeoutRef.current !== null) {
    clearTimeout(hideControlsTimeoutRef.current);
  }
  // Only auto-hide if playing (always visible when paused)
  if (isPlayingRef.current) {
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  }
}, []);
```

### Scrub-and-Resume Pattern

When scrubbing the timeline, the video pauses. When the user releases, it resumes if it was playing before:

```typescript
const startScrub = useCallback((clientX) => {
  wasPlayingBeforeScrubRef.current = isPlayingRef.current;
  setIsScrubbing(true);
  videoRef.current?.pause();
  updateScrub(clientX);
}, []);

const endScrub = useCallback(() => {
  setIsScrubbing(false);
  applyTime(scrubTimeRef.current);
  if (wasPlayingBeforeScrubRef.current) {
    videoRef.current?.play().catch(() => {});
  }
}, []);
```

### Source Change Recovery

When the video source URL changes (e.g. quality switch), the player remembers the current position:

```typescript
// Before teardown
const ct = video.currentTime;
if (ct > 0) {
  resumeTimeOnSourceChangeRef.current = ct;
}

// After new source loads
const handleLoadedMetadata = () => {
  const resumeTime = resumeTimeOnSourceChangeRef.current;
  if (resumeTime !== null && resumeTime > 0) {
    video.currentTime = resumeTime;
    resumeTimeOnSourceChangeRef.current = null;
  }
};
```

---

## 11. Composable Authorization Guards

lawn uses composable, hierarchical auth guards:

```typescript
// Each guard builds on the previous one
async function requireUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

async function requireTeamAccess(ctx, teamId, requiredRole?) {
  const user = await requireUser(ctx);
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", teamId).eq("userClerkId", user.subject)
    )
    .unique();

  if (!membership) throw new Error("Not a team member");

  if (requiredRole && ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }
  return { user, membership };
}

async function requireProjectAccess(ctx, projectId, requiredRole?) {
  const user = await requireUser(ctx);
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  // Delegates to team access check
  const { membership } = await requireTeamAccess(ctx, project.teamId, requiredRole);
  return { user, membership, project };
}

async function requireVideoAccess(ctx, videoId, requiredRole?) {
  const user = await requireUser(ctx);
  const video = await ctx.db.get(videoId);
  if (!video) throw new Error("Video not found");
  // Delegates to project access check → team access check
  const { membership, project } = await requireProjectAccess(ctx, video.projectId, requiredRole);
  return { user, membership, project, video };
}
```

### Role Hierarchy

```typescript
const ROLE_HIERARCHY = { owner: 4, admin: 3, member: 2, viewer: 1 };
```

One call to `requireVideoAccess(ctx, videoId, "member")` validates the entire chain: auth → team membership → role level → project exists → video exists.

---

## 12. Separated Route Data Files

Every route has a dedicated `.data.ts` file with three exports:

```typescript
// -video.data.ts

// 1. Essential specs — what to prewarm on hover
export function getVideoEssentialSpecs(params) {
  return [
    makeRouteQuerySpec(api.workspace.resolveContext, { ... }),
    makeRouteQuerySpec(api.videos.get, { ... }),
    makeRouteQuerySpec(api.comments.list, { ... }),
  ];
}

// 2. Data hook — what the component consumes
export function useVideoData(params) {
  const context = useQuery(api.workspace.resolveContext, { ... });
  const video = useQuery(api.videos.get, resolvedVideoId ? { ... } : "skip");
  return { context, video, comments };
}

// 3. Prewarm function — called by intent handlers
export async function prewarmVideo(convex, params) {
  prewarmSpecs(convex, getVideoEssentialSpecs(params));
}
```

### Why Separate Files

- **Route component stays clean** — no data fetching logic mixed with JSX
- **Prewarm functions are importable** — other routes can prefetch this route's data
- **Specs are testable** — you can unit test that the right queries are prewarmed
- **Tree-shaking** — if a route isn't visited, its data code isn't loaded

---

## 13. Memoization Discipline

lawn is deliberate about what gets memoized and what doesn't:

### useCallback for Every Event Handler Passed Down

```typescript
const togglePlay = useCallback(() => { ... }, []);
const seekTo = useCallback((time, options) => { ... }, [applyTime, showControls]);
const handleSeekBy = useCallback((delta) => { ... }, [applyTime, currentTime]);
const toggleMute = useCallback(() => { ... }, []);
const toggleFullscreen = useCallback(() => { ... }, []);
const handleDownload = useCallback(async () => { ... }, [downloadUrl, onRequestDownload]);
```

### useMemo for Computed Data

```typescript
// Comment markers grouped by proximity on timeline
const groupedMarkers = useMemo(() => {
  if (!duration || comments.length === 0) return [];
  const markers = [];
  for (const comment of comments) {
    const position = (comment.timestampSeconds / duration) * 100;
    const existing = markers.find((m) => Math.abs(m.position - position) < 1);
    if (!existing) markers.push({ position, comment });
  }
  return markers;
}, [comments, duration]);
```

### useRef for Values Used in Callbacks

```typescript
// Shadow state in refs so callbacks don't need state as dependencies
const isPlayingRef = useRef(false);
// Kept in sync:
const handlePlay = () => { setIsPlaying(true); isPlayingRef.current = true; };
const handlePause = () => { setIsPlaying(false); isPlayingRef.current = false; };
```

This avoids re-creating callbacks every time `isPlaying` changes, which would cause child components to re-render.

---

## 14. Keyboard-First Video Controls

```typescript
onKeyDown={(e) => {
  if (e.key === " " || e.key.toLowerCase() === "k") {
    e.preventDefault();
    togglePlay();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    handleSeekBy(-5);  // Back 5s
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    handleSeekBy(5);   // Forward 5s
  }
  if (e.key.toLowerCase() === "f") {
    e.preventDefault();
    toggleFullscreen();
  }
  if (e.key.toLowerCase() === "m") {
    e.preventDefault();
    toggleMute();
  }
}}
```

Combined with `tabIndex={0}` on the container div so it's focusable, and right-click context menu for copy timestamp, loop, and download.

---

## 15. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                  │
│  ┌─── HTML Head ───────────────────────────────────────────┐    │
│  │  preconnect → stream.mux.com, image.mux.com             │    │
│  │  dns-prefetch → stream.mux.com, image.mux.com           │    │
│  │  inline theme script (runs before paint)                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── Router (TanStack) ───────────────────────────────────┐    │
│  │  defaultPreload: "intent"                                │    │
│  │  scrollRestoration: true                                 │    │
│  │                                                          │    │
│  │  ┌─── Route Data (.data.ts files) ──────────────────┐   │    │
│  │  │  getEssentialSpecs()  → what to prewarm           │   │    │
│  │  │  useXxxData()         → hooks for components      │   │    │
│  │  │  prewarmXxx()         → intent-triggered fetch    │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │  ┌─── Prewarm Layer ───────────────────────────────┐    │    │
│  │  │  useRoutePrewarmIntent (120ms debounce)          │    │    │
│  │  │  prewarmSpecs (3s dedupe, 8s subscription hold)  │    │    │
│  │  │  prefetchHlsRuntime (one-time dynamic import)    │    │    │
│  │  │  prefetchMuxManifest (Set-based dedup)           │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── Convex Client ──────────────────────────────────────┐     │
│  │  ConvexReactClient + Clerk Auth                         │     │
│  │  useQuery (with "skip" for conditional queries)         │     │
│  │  useMutation (for writes)                               │     │
│  │  useAction (for S3 presigned URLs, Mux calls)          │     │
│  │  prewarmQuery (intent-based prefetch)                   │     │
│  │  Real-time subscriptions (WebSocket)                    │     │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── Video Pipeline ─────────────────────────────────────┐     │
│  │  Upload: Browser → presigned PUT → S3                   │     │
│  │  Process: S3 → Mux (webhook) → HLS transcoding          │     │
│  │  Play: Mux CDN → hls.js (Web Worker) → <video>         │     │
│  │  Presence: heartbeat (15s) + sendBeacon on unload       │     │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─── Build ──────────────────────────────────────────────┐     │
│  │  Vite 7 + TanStack Start                                │     │
│  │  SPA mode + prerendered marketing pages                  │     │
│  │  Bun runtime for fast installs & scripts                │     │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CONVEX BACKEND                            │
│                                                                  │
│  Queries:  workspace.resolveContext, videos.get, comments.list  │
│  Mutations: videos.create, comments.create, presence.heartbeat  │
│  Actions:  videoActions.getUploadUrl, videoActions.getDownloadUrl│
│  HTTP:     /webhooks/mux, /stripe/webhook, /health              │
│  Auth:     requireUser → requireTeamAccess → requireVideoAccess │
│  Rate Limiting: @convex-dev/rate-limiter (share links)          │
│  Presence: @convex-dev/presence (video watchers)                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│                                                                  │
│  Mux:     Transcoding, HLS streaming, thumbnails, CDN          │
│  S3:      Original file storage (Railway-hosted)                │
│  Clerk:   Authentication, JWT verification                      │
│  Stripe:  Subscription billing (via Convex component)           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: When to Apply Each Pattern

| Pattern | Apply When... |
|---------|--------------|
| Intent-based prewarming | Any clickable element that navigates to a data-heavy page |
| Two-stage prefetch | Dependent queries (need ID from first query to run second) |
| DNS prefetch + preconnect | Any external domain you'll hit (CDNs, APIs, media servers) |
| HLS runtime prefetch | Any lazy-loaded library >50KB that's likely to be needed |
| Conditional query skip | Queries that depend on data from other queries |
| Theme flash prevention | Any app with dark mode / theme support |
| SPA + prerendered pages | Marketing pages need SEO, app pages don't |
| XHR upload with rolling avg | File uploads where you need progress/speed/ETA |
| sendBeacon disconnect | Any presence/session system that needs reliable cleanup |
| Ref shadow state | Event handlers that read frequently-changing state |
| Composable auth guards | Multi-level resource access (org → project → resource) |
| Separated route data files | Any app with >5 routes that have data dependencies |
