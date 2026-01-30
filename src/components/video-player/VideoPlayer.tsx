"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import videojs from "video.js";
import Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import { CommentMarkers } from "./CommentMarkers";
import { cn } from "@/lib/utils";

interface Comment {
  _id: string;
  timestampSeconds: number;
  resolved: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  comments?: Comment[];
  onTimeUpdate?: (currentTime: number) => void;
  onMarkerClick?: (comment: Comment) => void;
  onTimelineClick?: (time: number) => void;
  initialTime?: number;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  comments = [],
  onTimeUpdate,
  onMarkerClick,
  onTimelineClick,
  initialTime,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-fluid");
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      poster,
      sources: [
        {
          src,
          type: src.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4",
        },
      ],
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
    });

    playerRef.current = player;

    player.on("loadedmetadata", () => {
      setDuration(player.duration() || 0);
      setIsReady(true);
      if (initialTime && initialTime > 0) {
        player.currentTime(initialTime);
      }
    });

    player.on("timeupdate", () => {
      const time = player.currentTime() || 0;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, poster, initialTime]);

  const seekTo = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime(time);
    }
  }, []);

  const handleMarkerClick = useCallback(
    (comment: Comment) => {
      seekTo(comment.timestampSeconds);
      onMarkerClick?.(comment);
    },
    [seekTo, onMarkerClick]
  );

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = percentage * duration;
      onTimelineClick?.(time);
    },
    [duration, onTimelineClick]
  );

  return (
    <div className={cn("relative", className)}>
      <div ref={videoRef} />
      {isReady && duration > 0 && comments.length > 0 && (
        <CommentMarkers
          comments={comments}
          duration={duration}
          currentTime={currentTime}
          onMarkerClick={handleMarkerClick}
          onTimelineClick={handleTimelineClick}
        />
      )}
    </div>
  );
}

export function useVideoPlayer() {
  const playerRef = useRef<Player | null>(null);

  const seekTo = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime(time);
    }
  }, []);

  const play = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
  }, []);

  return { playerRef, seekTo, play, pause };
}
