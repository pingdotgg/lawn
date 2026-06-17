import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useParams } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function ProjectSharePage() {
  const params = useParams({ strict: false });
  const token = params.token as string;

  const project = useQuery(api.projects.getByShareToken, { shareToken: token });
  const videos = useQuery(api.videos.listForProjectShare, { shareToken: token });

  if (project === undefined) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#dc2626]/10 flex items-center justify-center mb-4 border-2 border-[#dc2626]">
              <AlertCircle className="h-6 w-6 text-[#dc2626]" />
            </div>
            <CardTitle>Project not found</CardTitle>
            <CardDescription>
              This share link is invalid or has been revoked.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0e8]">
      <header className="bg-[#f0f0e8] border-b-2 border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[#1a1a1a]">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[#888] mt-0.5">{project.description}</p>
            )}
          </div>
          <Link
            preload="intent"
            to="/"
            className="text-[#888] hover:text-[#1a1a1a] text-sm font-bold"
          >
            lawn
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {videos === undefined ? (
          <div className="text-[#888]">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-[#888]">
            No videos yet.
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => {
              const thumbnailSrc = video.thumbnailUrl?.startsWith("http")
                ? video.thumbnailUrl
                : undefined;

              return (
                <Link
                  key={video._id}
                  to="/project-share/$token/$videoId"
                  params={{ token, videoId: video._id }}
                  className="group flex flex-col cursor-pointer"
                  preload="intent"
                >
                  <div className="relative aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_var(--shadow-color)] group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all">
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={video.title}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-10 w-10 text-[#888]" />
                      </div>
                    )}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-mono px-1.5 py-0.5">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <p className="text-[15px] text-[#1a1a1a] font-black truncate leading-tight">
                      {video.title}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t-2 border-[#1a1a1a] px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-[#888]">
          Shared via{" "}
          <Link to="/" preload="intent" className="text-[#1a1a1a] hover:text-[#2d5a2d] font-bold">
            lawn
          </Link>
        </div>
      </footer>
    </div>
  );
}
