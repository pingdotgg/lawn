import type { Id } from "@convex/_generated/dataModel";

export function findPreferredReplacementVideoId(
  versions: ReadonlyArray<{ _id: Id<"videos"> }> | undefined,
  deletingVideoId: Id<"videos">,
) {
  const deletingIndex = versions?.findIndex((version) => version._id === deletingVideoId) ?? -1;
  if (deletingIndex === -1 || !versions) return null;

  return versions[deletingIndex - 1]?._id ?? versions[deletingIndex + 1]?._id ?? null;
}
