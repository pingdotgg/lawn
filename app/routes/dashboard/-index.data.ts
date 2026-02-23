import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getDashboardIndexEssentialSpecs() {
  return [makeRouteQuerySpec(api.teams.listWithProjects, {})];
}

export function useDashboardIndexData() {
  const teams = useQuery(api.teams.listWithProjects);
  return { teams };
}

export async function prewarmDashboardIndex(convex: ConvexReactClient) {
  prewarmSpecs(convex, getDashboardIndexEssentialSpecs());
}
