import { Outlet, createFileRoute } from "@tanstack/react-router";
import { muxMediaLinks } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/$teamSlug/$projectId")({
  head: () => ({ links: muxMediaLinks() }),
  component: ProjectRouteLayout,
});

function ProjectRouteLayout() {
  return <Outlet />;
}
