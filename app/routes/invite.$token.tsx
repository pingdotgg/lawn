import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import InvitePage from "./-invite";

export const Route = createFileRoute("/invite/$token")({
  head: () =>
    seoHead({
      title: "Join team",
      description: "Accept your team invitation on lawn.",
      path: "/invite",
      noIndex: true,
    }),
  component: InvitePage,
});
