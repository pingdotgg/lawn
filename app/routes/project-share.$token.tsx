import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/project-share/$token")({
  component: ProjectShareLayout,
});

function ProjectShareLayout() {
  return <Outlet />;
}
