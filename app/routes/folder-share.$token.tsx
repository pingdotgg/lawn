import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import FolderSharePage from "./-folder-share";

export const Route = createFileRoute("/folder-share/$token")({
  validateSearch: (search: Record<string, unknown>) => ({
    folder: typeof search.folder === "string" ? search.folder : undefined,
    video: typeof search.video === "string" ? search.video : undefined,
  }),
  head: () =>
    seoHead({
      title: "Shared folder",
      description: "Browse videos shared from a lawn folder.",
      path: "/folder-share",
      noIndex: true,
    }),
  component: FolderShareRoute,
});

function FolderShareRoute() {
  const { token } = Route.useParams();
  const { folder, video } = Route.useSearch();
  return <FolderSharePage key={token} token={token} folderId={folder} videoId={video} />;
}
