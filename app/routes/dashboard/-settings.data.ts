import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getSettingsEssentialSpecs(params: { teamSlug: string }) {
  return [
    makeRouteQuerySpec(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
    }),
  ];
}

export function useSettingsData(params: { teamSlug: string }) {
  const context = useQuery(api.workspace.resolveContext, {
    teamSlug: params.teamSlug,
  });
  const team = context?.team;
  const members = useQuery(
    api.teams.getMembers,
    team ? { teamId: team._id } : "skip",
  );
  const billing = useQuery(
    api.billing.getTeamBilling,
    team ? { teamId: team._id } : "skip",
  );

  return { context, team, members, billing };
}

export async function prewarmSettings(
  convex: ConvexReactClient,
  params: { teamSlug: string },
) {
  prewarmSpecs(convex, getSettingsEssentialSpecs(params));

  try {
    const context = await convex.query(api.workspace.resolveContext, {
      teamSlug: params.teamSlug,
    });

    if (!context?.team?._id) return;

    prewarmSpecs(convex, [
      makeRouteQuerySpec(api.teams.getMembers, { teamId: context.team._id }),
      makeRouteQuerySpec(api.billing.getTeamBilling, { teamId: context.team._id }),
    ]);
  } catch (error) {
    console.warn("Settings dependent prewarm failed", error);
  }
}
