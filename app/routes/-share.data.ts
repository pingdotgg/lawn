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
  ];
}

export function useShareData(params: { token: string; grantToken?: string | null }) {
  const shareInfo = useQuery(api.shareLinks.getByToken, {
    token: params.token,
  });

  const videoData = useQuery(
    api.videos.getByShareGrant,
    params.grantToken ? { grantToken: params.grantToken } : "skip",
  );

  const comments = useQuery(
    api.comments.getThreadedForShareGrant,
    params.grantToken ? { grantToken: params.grantToken } : "skip",
  );

  return { shareInfo, videoData, comments };
}

export async function prewarmShare(
  convex: ConvexReactClient,
  params: { token: string },
) {
  prewarmSpecs(convex, getShareEssentialSpecs(params));
}
