import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "@convex/_generated/dataModel";
import ProjectPage from "./-project";

export const Route = createFileRoute("/dashboard/$teamSlug/$projectId/")({
  component: ProjectIndexRoute,
});

function ProjectIndexRoute() {
  const { teamSlug, projectId } = Route.useParams();

  return (
    <ProjectPage
      teamSlug={teamSlug}
      projectId={projectId as Id<"projects">}
    />
  );
}
