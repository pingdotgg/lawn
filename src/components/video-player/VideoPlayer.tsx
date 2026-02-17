"use client";

import { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import type Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  RotateCw,
  Timer,
} from "lucide-react";
import { cn, formatDuration, formatTimestamp } from "@/lib/utils";
import { triggerDownload } from "@/lib/download";

interface Comment {
  _id: string;
  timestampSeconds: number;
  resolved: boolean;
}

interface DownloadResult {
  url: string;
  filename?: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  comments?: Comment[];
  onTimeUpdate?: (currentTime: number) => void;
  onMarkerClick?: (comment: Comment) => void;
  initialTime?: number;
  className?: string;
  allowDownload?: boolean;
  downloadUrl?: string;
  downloadFilename?: string;
  onRequestDownload?: () => Promise<DownloadResult | null | undefined> | DownloadResult | null | undefined;
}

export interface VideoPlayerHandle {
  seekTo: (time: number, options?: { play?: boolean }) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isHlsSource(src: string) {
  return src.includes(".m3u8");
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    poster,
    comments = [],
    onTimeUpdate,
    onMarkerClick,
    initialTime,
    className,
    allowDownload = false,
    downloadUrl,
    downloadFilename,
    onRequestDownload,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const hideControlsTimeoutRef = useRef<number | null>(null);
  const wasPlayingBeforeScrubRef = useRef(false);
  const scrubTimeRef = useRef(0);
  const volumeBeforeMuteRef = useRef(1);
  const isPlayingRef = useRef(false);
  const isScrubbingRef = useRef(false);

  const groupedMarkers = useMemo(() => {
    if (!duration || comments.length === 0) return [] as { position: number; comment: Comment }[];

    const markers: { position: number; comment: Comment }[] = [];
    for (const comment of comments) {
      const position = (comment.timestampSeconds / duration) * 100;
      const existing = markers.find((m) => Math.abs(m.position - position) < 1);
      if (!existing) {
        markers.push({ position, comment });
      }
    }
    return markers;
  }, [comments, duration]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
    if (isPlayingRef.current) {
      hideControlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, []);

  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || video.buffered.length === 0) return;
    const end = video.buffered.end(video.buffered.length - 1);
    setBufferedPercent(clamp(end / video.duration, 0, 1));
  }, []);

  const applyTime = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const actualDuration = duration || video.duration || 0;
      const next = actualDuration > 0 ? clamp(time, 0, actualDuration) : Math.max(time, 0);
      video.currentTime = next;
      setCurrentTime(next);
      onTimeUpdate?.(next);
    },
    [duration, onTimeUpdate]
  );

  const seekTo = useCallback(
    (time: number, options?: { play?: boolean }) => {
      applyTime(time);
      if (options?.play) {
        const video = videoRef.current;
        if (video) {
          const playPromise = video.play();
          if (playPromise) {
            playPromise.catch(() => {
              // Ignore autoplay rejections.
            });
          }
        }
      }
      showControls();
    },
    [applyTime, showControls]
  );

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  const handleSeekBy = useCallback(
    (delta: number) => {
      applyTime((videoRef.current?.currentTime ?? 0) + delta);
      showControls();
    },
    [applyTime, showControls]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isMediaReady) return;

    showControls();

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Ignore play errors caused by browser autoplay policies.
        });
      }
    } else {
      video.pause();
    }
  }, [isMediaReady, showControls]);

  const setVideoVolume = useCallback((nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = clamp(nextVolume, 0, 1);
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setIsMuted(video.muted);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    showControls();

    if (video.muted || video.volume === 0) {
      const restored = volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 1;
      setVideoVolume(restored);
      video.muted = false;
      setIsMuted(false);
    } else {
      volumeBeforeMuteRef.current = video.volume;
      video.muted = true;
      setIsMuted(true);
    }
  }, [setVideoVolume, showControls]);

  const cyclePlaybackRate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    showControls();

    const currentIndex = PLAYBACK_RATES.findIndex((rate) => rate === video.playbackRate);
    const nextIndex = currentIndex === -1 ? 2 : (currentIndex + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIndex];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [showControls]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    showControls();

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen can fail in some embedded contexts; ignore gracefully.
    }
  }, [showControls]);

  const handleDownload = useCallback(async () => {
    if (!allowDownload || isDownloading) return;

    showControls();
    setIsDownloading(true);

    try {
      if (onRequestDownload) {
        const result = await onRequestDownload();
        if (result?.url) {
          triggerDownload(result.url, result.filename ?? downloadFilename);
          return;
        }
      }

      if (downloadUrl) {
        triggerDownload(downloadUrl, downloadFilename);
      }
    } finally {
      setContextMenu(null);
      setIsDownloading(false);
    }
  }, [allowDownload, isDownloading, onRequestDownload, downloadUrl, downloadFilename, showControls]);

  const copyTimestamp = useCallback(async () => {
    const timeToCopy = isScrubbing ? scrubTimeRef.current : currentTime;
    const label = formatTimestamp(timeToCopy);
    try {
      await navigator.clipboard.writeText(label);
    } catch {
      // Clipboard access may fail on some browsers; ignore silently.
    }
    setContextMenu(null);
    showControls();
  }, [currentTime, isScrubbing, showControls]);

  const toggleLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !loopEnabled;
    video.loop = next;
    setLoopEnabled(next);
    setContextMenu(null);
    showControls();
  }, [loopEnabled, showControls]);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !duration) return 0;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const percent = clamp((clientX - rect.left) / rect.width, 0, 1);
      return percent * duration;
    },
    [duration]
  );

  const startScrub = useCallback(
    (clientX: number) => {
      const video = videoRef.current;
      if (!video || !duration) return;

      wasPlayingBeforeScrubRef.current = !video.paused;
      video.pause();
      setIsScrubbing(true);

      const nextTime = getTimeFromClientX(clientX);
      scrubTimeRef.current = nextTime;
      setScrubTime(nextTime);
      setCurrentTime(nextTime);
      onTimeUpdate?.(nextTime);
    },
    [duration, getTimeFromClientX, onTimeUpdate]
  );

  const updateScrub = useCallback(
    (clientX: number) => {
      if (!isScrubbingRef.current) return;
      const nextTime = getTimeFromClientX(clientX);
      scrubTimeRef.current = nextTime;
      setScrubTime(nextTime);
      setCurrentTime(nextTime);
      onTimeUpdate?.(nextTime);
    },
    [getTimeFromClientX, onTimeUpdate]
  );

  const endScrub = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const finalTime = clamp(scrubTimeRef.current, 0, duration);
    video.currentTime = finalTime;
    setCurrentTime(finalTime);
    setIsScrubbing(false);

    if (wasPlayingBeforeScrubRef.current) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Ignore autoplay rejections after scrubbing.
        });
      }
    }
  }, [duration]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current !== null) {
        window.clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const handleLoadedMetadata = () => {
      if (cancelled) return;
      setDuration(video.duration || 0);
      updateBuffered();
      if (initialTime && initialTime > 0) {
        video.currentTime = clamp(initialTime, 0, video.duration || initialTime);
      }
    };

    const handleLoadedData = () => {
      if (cancelled) return;
      setIsMediaReady(true);
      setIsBuffering(false);
    };

    const handleDurationChange = () => {
      if (cancelled) return;
      setDuration(video.duration || 0);
    };

    const handleTimeUpdate = () => {
      if (cancelled || isScrubbingRef.current) return;
      const time = video.currentTime || 0;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handlePlay = () => {
      if (cancelled) return;
      setIsPlaying(true);
      setIsBuffering(false);
      showControls();
    };

    const handlePause = () => {
      if (cancelled) return;
      setIsPlaying(false);
      setIsBuffering(false);
      setControlsVisible(true);
    };

    const handleWaiting = () => {
      if (cancelled) return;
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      if (cancelled) return;
      setIsMediaReady(true);
      setIsBuffering(false);
    };

    const handleCanPlay = () => {
      if (cancelled) return;
      setIsMediaReady(true);
    };

    const handleError = () => {
      if (cancelled) return;
      setIsMediaReady(true);
      setIsBuffering(false);
    };

    const handleVolumeChange = () => {
      if (cancelled) return;
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    const handleRateChange = () => {
      if (cancelled) return;
      setPlaybackRate(video.playbackRate || 1);
    };

    const handleProgress = () => {
      if (cancelled) return;
      updateBuffered();
    };

    const handleEnded = () => {
      if (cancelled) return;
      setIsPlaying(false);
      setControlsVisible(true);
    };

    const attachSource = async () => {
      // Clean up any previous HLS instance.
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      setDuration(0);
      setCurrentTime(0);
      setBufferedPercent(0);
      setIsMediaReady(false);
      setIsBuffering(false);

      // Reset the element source before attaching a new one.
      video.removeAttribute("src");
      video.load();

      if (isHlsSource(src)) {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // Metadata events still drive readiness; nothing else needed here.
          });
        } else {
          video.src = src;
        }
      } else {
        video.src = src;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ratechange", handleRateChange);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("ended", handleEnded);

    attachSource().catch(() => {
      // If HLS import fails, fall back to setting the src directly.
      video.src = src;
    });

    return () => {
      cancelled = true;

      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ratechange", handleRateChange);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("ended", handleEnded);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.removeAttribute("src");
      video.load();
    };
  }, [src, initialTime, onTimeUpdate, showControls, updateBuffered]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMove = (e: PointerEvent) => updateScrub(e.clientX);
    const handleUp = () => endScrub();

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [endScrub, isScrubbing, updateScrub]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("blur", handleClose);
    window.addEventListener("contextmenu", handleClose);

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("blur", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, [contextMenu]);

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const playedPercent = duration > 0 ? clamp(displayTime / duration, 0, 1) : 0;
  const canDownload = allowDownload && (Boolean(downloadUrl) || Boolean(onRequestDownload));

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.45)]",
          isFullscreen && "rounded-none border-none"
        )}
        tabIndex={0}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        onMouseLeave={() => {
          if (isPlaying && isMediaReady) {
            setControlsVisible(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key.toLowerCase() === "k") {
            e.preventDefault();
            togglePlay();
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            handleSeekBy(-5);
            return;
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            handleSeekBy(5);
            return;
          }
          if (e.key.toLowerCase() === "f") {
            e.preventDefault();
            toggleFullscreen();
            return;
          }
          if (e.key.toLowerCase() === "m") {
            e.preventDefault();
            toggleMute();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          showControls();
          const rect = e.currentTarget.getBoundingClientRect();
          const menuWidth = 180;
          const menuHeight = 120;
          const x = clamp(e.clientX - rect.left, 8, rect.width - menuWidth - 8);
          const y = clamp(e.clientY - rect.top, 8, rect.height - menuHeight - 8);
          setContextMenu({ x, y });
        }}
      >
        <video
          ref={videoRef}
          poster={poster}
          className={cn(
            "h-full w-full object-contain transition-opacity duration-200",
            isMediaReady ? "opacity-100" : "opacity-0"
          )}
          playsInline
          preload="auto"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        />

        {!isMediaReady && (
          <div className="pointer-events-none absolute inset-0 z-[5]">
            {poster ? (
              <img
                src={poster}
                alt=""
                className="h-full w-full object-cover blur-[4px]"
              />
            ) : (
              <div className="h-full w-full bg-zinc-900" />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              <p className="text-sm font-medium text-white/85">Loading stream...</p>
            </div>
          </div>
        )}

        {/* Big play button */}
        {!isPlaying && isMediaReady && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="pointer-events-auto inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition hover:scale-[1.03] hover:border-white/30 hover:bg-black/75"
              aria-label="Play video"
            >
              <Play className="ml-1 h-9 w-9" />
            </button>
          </div>
        )}

        {/* Buffering indicator */}
        {isBuffering && isPlaying && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        )}

        {/* Bottom controls */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 transition-opacity",
            controlsVisible && isMediaReady ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-10">
            {/* Timeline */}
            <div
              ref={trackRef}
              className="relative mb-3 h-3 w-full cursor-pointer rounded-full border border-white/10 bg-white/10"
              onPointerDown={(e) => {
                e.preventDefault();
                showControls();
                startScrub(e.clientX);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/20"
                style={{ width: `${bufferedPercent * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--accent)]"
                style={{ width: `${playedPercent * 100}%` }}
              />

              {/* Comment markers on main timeline */}
              {groupedMarkers.map((marker) => {
                const isResolved = marker.comment.resolved;
                const isActive = Math.abs(displayTime - marker.comment.timestampSeconds) < 1.5;
                return (
                  <button
                    key={marker.comment._id}
                    type="button"
                    className={cn(
                      "absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 shadow",
                      isResolved ? "bg-green-400" : "bg-orange-400",
                      isActive && "ring-2 ring-white/60"
                    )}
                    style={{ left: `${marker.position}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const time = marker.comment.timestampSeconds;
                      applyTime(time);
                      onMarkerClick?.(marker.comment);
                      showControls();
                    }}
                    aria-label={`Jump to comment at ${formatTimestamp(marker.comment.timestampSeconds)}`}
                    title={`Comment at ${formatTimestamp(marker.comment.timestampSeconds)}`}
                  />
                );
              })}

              {/* Scrubber */}
              <div
                className="absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white shadow"
                style={{ left: `${playedPercent * 100}%` }}
              />
            </div>

            {/* Control row */}
            <div className="flex flex-wrap items-center gap-2 text-white">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:border-white/25 hover:bg-white/20"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>

              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  aria-label="Volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    e.stopPropagation();
                    const next = Number(e.target.value);
                    setVideoVolume(next);
                  }}
                  className="h-1 w-24 cursor-pointer accent-[color:var(--accent)]"
                />
              </div>

              <div className="min-w-[110px] rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/90">
                <span className="font-mono">
                  {formatDuration(displayTime)} / {formatDuration(duration || 0)}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeekBy(-10);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-white/25 hover:bg-white/15"
                  aria-label="Rewind 10 seconds"
                  title="Rewind 10 seconds"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeekBy(10);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-white/25 hover:bg-white/15"
                  aria-label="Forward 10 seconds"
                  title="Forward 10 seconds"
                >
                  <RotateCw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cyclePlaybackRate();
                  }}
                  className="inline-flex h-9 min-w-[56px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/95 transition hover:border-white/25 hover:bg-white/15"
                  aria-label={`Playback speed ${playbackRate}x`}
                  title="Change playback speed"
                >
                  {playbackRate}x
                </button>

                {canDownload && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload();
                    }}
                    disabled={isDownloading}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/20 disabled:opacity-60"
                    aria-label="Download video"
                    title="Download video"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {isDownloading ? "Preparing..." : "Download"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:border-white/25 hover:bg-white/20"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom context menu */}
        {contextMenu && (
          <div
            className="absolute z-30 w-44 rounded-lg border border-white/10 bg-black/90 p-1.5 text-sm text-white shadow-2xl backdrop-blur"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {canDownload && (
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-white/95 transition hover:bg-white/10 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? "Preparing download..." : "Download video"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void copyTimestamp()}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-white/95 transition hover:bg-white/10"
            >
              <Timer className="h-4 w-4" />
              Copy timestamp ({formatTimestamp(displayTime)})
            </button>
            <button
              type="button"
              onClick={toggleLoop}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-white/95 transition hover:bg-white/10"
            >
              {loopEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {loopEnabled ? "Disable loop" : "Loop video"}
            </button>
          </div>
        )}
      </div>

    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
