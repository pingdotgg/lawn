import { createFileRoute } from "@tanstack/react-router";
import InvitePage from "./-invite";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});
