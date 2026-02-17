import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getInviteEssentialSpecs(params: { token: string }) {
  return [
    makeRouteQuerySpec(api.teams.getInviteByToken, {
      token: params.token,
    }),
  ];
}

export function useInviteData(params: { token: string }) {
  const invite = useQuery(api.teams.getInviteByToken, {
    token: params.token,
  });

  return { invite };
}

export async function prewarmInvite(
  convex: ConvexReactClient,
  params: { token: string },
) {
  prewarmSpecs(convex, getInviteEssentialSpecs(params));
}
