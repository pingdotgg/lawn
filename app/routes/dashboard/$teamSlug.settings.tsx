import { createFileRoute } from "@tanstack/react-router";
import TeamSettingsPage from "./-settings";

export const Route = createFileRoute("/dashboard/$teamSlug/settings")({
  component: TeamSettingsPage,
});
