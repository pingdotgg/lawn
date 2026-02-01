"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/video-player/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { triggerDownload } from "@/lib/download";
import { Lock, Download, Video, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const shareInfo = useQuery(api.shareLinks.getByToken, { token });
  const videoData = useQuery(api.videos.getByShareToken, { token });
  const verifyPassword = useMutation(api.videos.verifySharePassword);
  const incrementViewCount = useMutation(api.videos.incrementViewCount);
  const getSharedPlaybackUrl = useAction(api.videoActions.getSharedPlaybackUrl);
  const getSharedDownloadUrl = useAction(api.videoActions.getSharedDownloadUrl);

  const [passwordInput, setPasswordInput] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isHeaderDownloading, setIsHeaderDownloading] = useState(false);
  const hasTrackedViewRef = useRef(false);

  const allowDownload = videoData?.allowDownload ?? false;

  // Track view on first load
  useEffect(() => {
    if (videoData?.video && !hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      incrementViewCount({ token }).catch(console.error);
    }
  }, [videoData, token, incrementViewCount]);

  // Fetch presigned playback URL when video data is available and password is verified (if needed)
  useEffect(() => {
    const shouldFetch = videoData?.video?.s3Key && (!videoData.hasPassword || isPasswordVerified);
    if (shouldFetch) {
      getSharedPlaybackUrl({ token })
        .then(({ url }) => {
          setPlaybackError(null);
          setPlaybackUrl(url);
        })
        .catch((err) => {
          setPlaybackError(err.message || "Failed to load video");
        });
    }
  }, [videoData, token, isPasswordVerified, getSharedPlaybackUrl]);

  const requestDownload = useCallback(async () => {
    if (!allowDownload) return null;
    try {
      const result = await getSharedDownloadUrl({ token });
      return result;
    } catch (error) {
      console.error("Failed to prepare shared download:", error);
      return null;
    }
  }, [allowDownload, getSharedDownloadUrl, token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const valid = await verifyPassword({ token, password: passwordInput });
      if (valid) {
        setIsPasswordVerified(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    }
  };

  if (shareInfo === undefined || videoData === undefined) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  const isExpired =
    typeof shareInfo === "object" &&
    shareInfo !== null &&
    "expired" in shareInfo &&
    Boolean(shareInfo.expired);

  // Link not found or expired
  if (shareInfo === null || isExpired) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#dc2626]/10 flex items-center justify-center mb-4 border-2 border-[#dc2626]">
              <AlertCircle className="h-6 w-6 text-[#dc2626]" />
            </div>
            <CardTitle>Link expired or invalid</CardTitle>
            <CardDescription>
              This share link is no longer valid. Please ask the video owner for a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Go to lawn
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required
  if (videoData?.hasPassword && !isPasswordVerified) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#e8e8e0] flex items-center justify-center mb-4 border-2 border-[#1a1a1a]">
              <Lock className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle>Password required</CardTitle>
            <CardDescription>
              This video is password protected. Enter the password to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-[#dc2626]">Incorrect password</p>
              )}
              <Button type="submit" className="w-full" disabled={!passwordInput}>
                View video
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Video not found or not ready
  if (!videoData?.video) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#e8e8e0] flex items-center justify-center mb-4 border-2 border-[#1a1a1a]">
              <Video className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle>Video not available</CardTitle>
            <CardDescription>
              This video is not available or is still processing.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { video } = videoData;

  return (
    <div className="min-h-screen bg-[#f0f0e8]">
      {/* Header */}
      <header className="bg-[#f0f0e8] border-b-2 border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-[#888] hover:text-[#1a1a1a] text-sm flex items-center gap-2 font-bold"
            >
              lawn
            </Link>
          </div>
          {allowDownload && (
            <Button
              variant="outline"
              size="sm"
              disabled={isHeaderDownloading}
              onClick={async () => {
                if (isHeaderDownloading) return;
                setIsHeaderDownloading(true);
                const result = await requestDownload();
                if (result?.url) {
                  triggerDownload(result.url, result.filename ?? `${video.title}.mp4`);
                }
                setIsHeaderDownloading(false);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              {isHeaderDownloading ? "Preparing..." : "Download"}
            </Button>
          )}
        </div>
      </header>

      {/* Video */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-black text-[#1a1a1a]">{video.title}</h1>
          {video.description && (
            <p className="text-[#888] mt-1">{video.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-[#888]">
            {video.duration && <span className="font-mono">{formatDuration(video.duration)}</span>}
          </div>
        </div>

        {playbackUrl ? (
          <div className="border-2 border-[#1a1a1a] overflow-hidden">
            <VideoPlayer
              src={playbackUrl}
              poster={video.thumbnailUrl}
              allowDownload={allowDownload}
              downloadFilename={`${video.title}.mp4`}
              onRequestDownload={requestDownload}
            />
          </div>
        ) : playbackError ? (
          <div className="aspect-video bg-[#e8e8e0] border-2 border-[#1a1a1a] flex items-center justify-center">
            <p className="text-[#dc2626]">{playbackError}</p>
          </div>
        ) : (
          <div className="aspect-video bg-[#e8e8e0] border-2 border-[#1a1a1a] flex items-center justify-center">
            <p className="text-[#888]">Loading video...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-[#888]">
          Shared via{" "}
          <Link href="/" className="text-[#1a1a1a] hover:text-[#2d5a2d] font-bold">
            lawn
          </Link>
        </div>
      </footer>
    </div>
  );
}
