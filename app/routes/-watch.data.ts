import { useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
} from "@/lib/convexRouteData";

export function getWatchEssentialSpecs(params: { publicId: string }) {
  return [
    makeRouteQuerySpec(api.videos.getByPublicId, {
      publicId: params.publicId,
    }),
    makeRouteQuerySpec(api.comments.getThreadedForPublic, {
      publicId: params.publicId,
    }),
  ];
}

export function useWatchData(params: { publicId: string }) {
  const videoData = useQuery(api.videos.getByPublicId, {
    publicId: params.publicId,
  });

  const comments = useQuery(api.comments.getThreadedForPublic, {
    publicId: params.publicId,
  });

  return { videoData, comments };
}

export async function prewarmWatch(
  convex: ConvexReactClient,
  params: { publicId: string },
) {
  prewarmSpecs(convex, getWatchEssentialSpecs(params));
}
