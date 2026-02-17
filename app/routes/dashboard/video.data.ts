import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getVideoEssentialSpecs(params: {
  teamSlug: string;
  projectId: Id<"projects">;
  videoId: Id<"videos">;
}) {
  return [
    makeRouteQuerySpec(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
      projectId: params.projectId,
      videoId: params.videoId,
    }),
    makeRouteQuerySpec(api.videos.get, {
      videoId: params.videoId,
    }),
    makeRouteQuerySpec(api.comments.list, {
      videoId: params.videoId,
    }),
    makeRouteQuerySpec(api.comments.getThreaded, {
      videoId: params.videoId,
    }),
  ];
}

export function useVideoData(params: {
  teamSlug: string;
  projectId: Id<"projects">;
  videoId: Id<"videos">;
}) {
  const context = useQuery(api.workspace.resolveContext, {
    teamSlug: params.teamSlug,
    projectId: params.projectId,
    videoId: params.videoId,
  });
  const resolvedTeamSlug = context?.team.slug ?? params.teamSlug;
  const resolvedProjectId = context?.project?._id;
  const resolvedVideoId = context?.video?._id;

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

  return {
    context,
    resolvedTeamSlug,
    resolvedProjectId,
    resolvedVideoId,
    video,
    comments,
    commentsThreaded,
  };
}

export async function prewarmVideo(
  convex: ConvexReactClient,
  params: {
    teamSlug: string;
    projectId: Id<"projects">;
    videoId: Id<"videos">;
  },
) {
  prewarmSpecs(convex, getVideoEssentialSpecs(params));
}
