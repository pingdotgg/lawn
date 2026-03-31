import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "@convex/_generated/dataModel";
import ProjectPage from "./-project";

export const Route = createFileRoute(
  "/dashboard/$teamSlug/$projectId/f/$folderId",
)({
  component: FolderRoute,
});

function FolderRoute() {
  const { teamSlug, projectId, folderId } = Route.useParams();

  return (
    <ProjectPage
      teamSlug={teamSlug}
      projectId={projectId as Id<"projects">}
      folderId={folderId as Id<"folders">}
    />
  );
}
