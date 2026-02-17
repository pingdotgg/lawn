import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getTeamEssentialSpecs(params: { teamSlug: string }) {
  return [
    makeRouteQuerySpec(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
    }),
  ];
}

export function useTeamData(params: { teamSlug: string }) {
  const context = useQuery(api.workspace.resolveContext, {
    teamSlug: params.teamSlug,
  });
  const team = context?.team;
  const projects = useQuery(api.projects.list, team ? { teamId: team._id } : "skip");

  return { context, team, projects };
}

export async function prewarmTeam(
  convex: ConvexReactClient,
  params: { teamSlug: string },
) {
  prewarmSpecs(convex, getTeamEssentialSpecs(params));

  try {
    const context = await convex.query(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
    });

    if (!context?.team?._id) return;

    prewarmSpecs(convex, [
      makeRouteQuerySpec(api.projects.list, { teamId: context.team._id }),
    ]);
  } catch (error) {
    console.warn("Team dependent prewarm failed", error);
  }
}
