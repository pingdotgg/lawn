import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getProjectEssentialSpecs(params: {
  teamSlug: string;
  projectId: Id<"projects">;
  folderId?: Id<"folders">;
}) {
  return [
    makeRouteQuerySpec(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
      projectId: params.projectId,
    }),
    makeRouteQuerySpec(api.projects.get, {
      projectId: params.projectId,
    }),
    makeRouteQuerySpec(api.videos.list, {
      projectId: params.projectId,
      folderId: params.folderId,
    }),
    makeRouteQuerySpec(api.folders.list, {
      projectId: params.projectId,
    }),
  ];
}

export function useProjectData(params: {
  teamSlug: string;
  projectId: Id<"projects">;
  folderId?: Id<"folders">;
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
  const videos = useQuery(
    api.videos.list,
    resolvedProjectId
      ? { projectId: resolvedProjectId, folderId: params.folderId }
      : "skip",
  );
  const folders = useQuery(
    api.folders.list,
    resolvedProjectId ? { projectId: resolvedProjectId } : "skip",
  );
  const currentFolder = useQuery(
    api.folders.get,
    params.folderId ? { folderId: params.folderId } : "skip",
  );

  return {
    context,
    resolvedProjectId,
    resolvedTeamSlug,
    project,
    videos,
    folders,
    currentFolder,
  };
}

export async function prewarmProject(
  convex: ConvexReactClient,
  params: {
    teamSlug: string;
    projectId: Id<"projects">;
    folderId?: Id<"folders">;
  },
) {
  prewarmSpecs(convex, getProjectEssentialSpecs(params));
}
