import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMemo } from "react";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";
import { useHeldWhileLoading } from "@/lib/useHeldWhileLoading";

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
  const teamId = context?.team?._id;
  const projects = useQuery(api.projects.list, teamId ? { teamId } : "skip");
  const billing = useQuery(api.billing.getTeamBilling, teamId ? { teamId } : "skip");

  // Switch teams as one unit, holding the previous team briefly so fast switches don't flash.
  const loaded = useMemo(
    () =>
      context === undefined || (teamId && (projects === undefined || billing === undefined))
        ? undefined
        : { context, projects, billing },
    [context, teamId, projects, billing],
  );
  const { value: held, isHeld } = useHeldWhileLoading(loaded);

  return {
    context: held?.context,
    team: held?.context?.team,
    projects: held?.projects,
    billing: held?.billing,
    isHeld,
  };
}

export async function prewarmTeam(convex: ConvexReactClient, params: { teamSlug: string }) {
  prewarmSpecs(convex, getTeamEssentialSpecs(params));

  try {
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
