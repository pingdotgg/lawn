import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";
import { getBrowserHostname } from "@/lib/shareHost";

export function getShareEssentialSpecs(params: { token: string; shareHost?: string | null }) {
  return [
    makeRouteQuerySpec(api.shareLinks.getByToken, {
      token: params.token,
      shareHost: params.shareHost ?? undefined,
    }),
  ];
}

export function useShareData(params: { token: string; grantToken?: string | null }) {
  const shareHost = getBrowserHostname() ?? undefined;

  const shareInfo = useQuery(api.shareLinks.getByToken, {
    token: params.token,
    shareHost,
  });

  const videoData = useQuery(
    api.videos.getByShareGrant,
    params.grantToken ? { grantToken: params.grantToken, shareHost } : "skip",
  );

  const comments = useQuery(
    api.comments.getThreadedForShareGrant,
    params.grantToken ? { grantToken: params.grantToken, shareHost } : "skip",
  );

  return { shareInfo, videoData, comments, shareHost };
}

export async function prewarmShare(
  convex: ConvexReactClient,
  params: { token: string; shareHost?: string | null },
) {
  prewarmSpecs(
    convex,
    getShareEssentialSpecs({
      token: params.token,
      shareHost: params.shareHost ?? getBrowserHostname(),
    }),
  );
}
