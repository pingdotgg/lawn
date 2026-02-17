import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getShareEssentialSpecs(params: { token: string }) {
  return [
    makeRouteQuerySpec(api.shareLinks.getByToken, {
      token: params.token,
    }),
    makeRouteQuerySpec(api.videos.getByShareToken, {
      token: params.token,
    }),
  ];
}

export function useShareData(params: { token: string }) {
  const shareInfo = useQuery(api.shareLinks.getByToken, {
    token: params.token,
  });
  const videoData = useQuery(api.videos.getByShareToken, {
    token: params.token,
  });

  return { shareInfo, videoData };
}

export async function prewarmShare(
  convex: ConvexReactClient,
  params: { token: string },
) {
  prewarmSpecs(convex, getShareEssentialSpecs(params));
}
