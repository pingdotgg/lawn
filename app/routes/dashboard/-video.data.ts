import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";
import { useMemo } from "react";

export function threadComments<
  T extends { _id: string; parentId?: string; timestampSeconds: number; _creationTime: number },
>(comments: readonly T[]) {
  const topLevel: T[] = [];
  const repliesByParent = new Map<string, T[]>();

  for (const comment of comments) {
    if (!comment.parentId) {
      topLevel.push(comment);
      continue;
    }

    const replies = repliesByParent.get(comment.parentId);
    if (replies) {
      replies.push(comment);
    } else {
      repliesByParent.set(comment.parentId, [comment]);
    }
  }

  topLevel.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  for (const replies of repliesByParent.values()) {
    replies.sort((a, b) => a._creationTime - b._creationTime);
  }

  return topLevel.map((comment) => ({
    ...comment,
    replies: repliesByParent.get(comment._id) ?? [],
  }));
}

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
    makeRouteQuerySpec(api.videos.listVersions, {
      videoId: params.videoId,
    }),
    makeRouteQuerySpec(api.comments.list, {
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

  const video = useQuery(api.videos.get, resolvedVideoId ? { videoId: resolvedVideoId } : "skip");
  const versions = useQuery(
    api.videos.listVersions,
    resolvedVideoId ? { videoId: resolvedVideoId } : "skip",
  );
  const comments = useQuery(
    api.comments.list,
    resolvedVideoId ? { videoId: resolvedVideoId } : "skip",
  );
  const commentsThreaded = useMemo(
    () => (comments === undefined ? undefined : threadComments(comments)),
    [comments],
  );

  return {
    context,
    resolvedTeamSlug,
    resolvedProjectId,
    resolvedVideoId,
    video,
    versions,
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
