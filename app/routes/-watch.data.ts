import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";
import { getBrowserHostname } from "@/lib/shareHost";

export function getWatchEssentialSpecs(params: { publicId: string; shareHost?: string | null }) {
  const shareHost = params.shareHost ?? undefined;
  return [
    makeRouteQuerySpec(api.videos.getByPublicId, {
      publicId: params.publicId,
      shareHost,
    }),
    makeRouteQuerySpec(api.videos.listPublicVersions, {
      publicId: params.publicId,
      shareHost,
    }),
    makeRouteQuerySpec(api.comments.getThreadedForPublic, {
      publicId: params.publicId,
      shareHost,
    }),
  ];
}

export function useWatchData(params: { publicId: string }) {
  const shareHost = getBrowserHostname() ?? undefined;

  const videoData = useQuery(api.videos.getByPublicId, {
    publicId: params.publicId,
    shareHost,
  });

  const versions = useQuery(api.videos.listPublicVersions, {
    publicId: params.publicId,
    shareHost,
  });

  const comments = useQuery(api.comments.getThreadedForPublic, {
    publicId: params.publicId,
    shareHost,
  });

  return { videoData, versions, comments, shareHost };
}

export async function prewarmWatch(
  convex: ConvexReactClient,
  params: { publicId: string; shareHost?: string | null },
) {
  prewarmSpecs(
    convex,
    getWatchEssentialSpecs({
      publicId: params.publicId,
      shareHost: params.shareHost ?? getBrowserHostname(),
    }),
  );
}
