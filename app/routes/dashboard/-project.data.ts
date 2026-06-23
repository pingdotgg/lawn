import { usePaginatedQuery, useQuery, type ConvexReactClient } from "convex/react";
import { useRef } from "react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";
import type { DashboardSort } from "@/lib/dashboardSort";

const VIDEO_PAGE_SIZE = 40;

export function getProjectEssentialSpecs(params: { teamSlug: string; projectId: Id<"projects"> }) {
  return [
    makeRouteQuerySpec(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
      projectId: params.projectId,
    }),
    makeRouteQuerySpec(api.projects.get, {
      projectId: params.projectId,
    }),
    makeRouteQuerySpec(api.projects.listChildren, {
      projectId: params.projectId,
    }),
    makeRouteQuerySpec(api.projects.breadcrumb, {
      projectId: params.projectId,
    }),
    makeRouteQuerySpec(api.videos.list, {
      projectId: params.projectId,
      sort: "last-uploaded",
      paginationOpts: { cursor: null, numItems: VIDEO_PAGE_SIZE },
    }),
  ];
}

export function useProjectData(params: {
  teamSlug: string;
  projectId: Id<"projects">;
  sort: DashboardSort;
}) {
  const context = useQuery(api.workspace.resolveContext, {
    teamSlug: params.teamSlug,
    projectId: params.projectId,
  });
  const resolvedProjectId = context?.project?._id;
  const resolvedTeamSlug = context?.team.slug ?? params.teamSlug;
  const project = useQuery(
    api.projects.get,
    resolvedProjectId ? { projectId: resolvedProjectId } : "skip",
  );
  const {
    results: paginatedVideos,
    status: videosStatus,
    loadMore,
  } = usePaginatedQuery(
    api.videos.list,
    resolvedProjectId ? { projectId: resolvedProjectId, sort: params.sort } : "skip",
    { initialNumItems: VIDEO_PAGE_SIZE },
  );
  // usePaginatedQuery deliberately cache-busts its first request. Read the
  // id-less first page while that request starts so hover prewarming can still
  // paint the project immediately, then hand off to the live paginated result.
  const prewarmedVideoPage = useQuery(
    api.videos.list,
    resolvedProjectId && videosStatus === "LoadingFirstPage"
      ? {
          projectId: resolvedProjectId,
          sort: params.sort,
          paginationOpts: { cursor: null, numItems: VIDEO_PAGE_SIZE },
        }
      : "skip",
  );
  const lastSettledVideosRef = useRef({
    projectId: resolvedProjectId,
    videos: paginatedVideos,
  });
  if (lastSettledVideosRef.current.projectId !== resolvedProjectId) {
    lastSettledVideosRef.current = { projectId: resolvedProjectId, videos: [] };
  }
  if (videosStatus !== "LoadingFirstPage") {
    lastSettledVideosRef.current = { projectId: resolvedProjectId, videos: paginatedVideos };
  }
  const videosSortPending = videosStatus === "LoadingFirstPage" && !prewarmedVideoPage;
  const videos =
    videosStatus === "LoadingFirstPage"
      ? (prewarmedVideoPage?.page ?? lastSettledVideosRef.current.videos)
      : paginatedVideos;
  const childFolders = useQuery(
    api.projects.listChildren,
    resolvedProjectId ? { projectId: resolvedProjectId } : "skip",
  );
  const breadcrumb = useQuery(
    api.projects.breadcrumb,
    resolvedProjectId ? { projectId: resolvedProjectId } : "skip",
  );

  return {
    context,
    resolvedProjectId,
    resolvedTeamSlug,
    project,
    videos,
    videosStatus,
    videosSortPending,
    loadMoreVideos: () => loadMore(VIDEO_PAGE_SIZE),
    childFolders,
    breadcrumb,
  };
}

export async function prewarmProject(
  convex: ConvexReactClient,
  params: {
    teamSlug: string;
    projectId: Id<"projects">;
  },
) {
  prewarmSpecs(convex, getProjectEssentialSpecs(params));
}
