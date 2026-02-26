import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import SharePage from "./-share";

export const Route = createFileRoute("/share/$token")({
  head: () =>
    seoHead({
      title: "Shared video",
      description: "Review this shared video on lawn.",
      path: "/share",
      noIndex: true,
    }),
  component: SharePage,
});
