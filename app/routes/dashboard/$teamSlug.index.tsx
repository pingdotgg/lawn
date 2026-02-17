import { createFileRoute } from "@tanstack/react-router";
import TeamPage from "./-team";

export const Route = createFileRoute("/dashboard/$teamSlug/")({
  component: TeamPage,
});
