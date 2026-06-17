import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import ProjectShareVideoPage from "./-project-share-video";

export const Route = createFileRoute("/project-share/$token/$videoId")({
  head: ({ params }) =>
    seoHead({
      title: "Shared video",
      description: "Watch this shared video on lawn.",
      path: `/project-share/${params.token}/${params.videoId}`,
      noIndex: true,
    }),
  component: ProjectShareVideoPage,
});
