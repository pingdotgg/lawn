import { createFileRoute } from "@tanstack/react-router";
import VideoPage from "./-video";

export const Route = createFileRoute("/dashboard/$teamSlug/$projectId/$videoId")({
  component: VideoPage,
});
