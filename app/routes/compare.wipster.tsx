import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import CompareWipster from "./-compare-wipster";

export const Route = createFileRoute("/compare/wipster")({
  head: () =>
    seoHead({
      title: "lawn vs Wipster — simpler video review, flat pricing",
      description:
        "Compare lawn and Wipster. Flat $5/month vs per-user pricing. Open source, instant playback, unlimited seats. The simpler alternative.",
      path: "/compare/wipster",
      ogImage: "/og/compare-wipster.png",
    }),
  component: CompareWipster,
});
