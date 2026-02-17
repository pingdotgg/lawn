import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$teamSlug")({
  component: TeamRoute,
});

function TeamRoute() {
  return <Outlet />;
}
