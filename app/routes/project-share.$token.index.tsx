import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import ProjectSharePage from "./-project-share";

export const Route = createFileRoute("/project-share/$token/")({
  head: ({ params }) =>
    seoHead({
      title: "Shared project",
      description: "Browse this shared project on lawn.",
      path: `/project-share/${params.token}`,
      noIndex: true,
    }),
  component: ProjectSharePage,
});
