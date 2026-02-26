import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import CompareFrameio from "./-compare-frameio";

export const Route = createFileRoute("/compare/frameio")({
  head: () =>
    seoHead({
      title: "lawn vs Frame.io — the cheaper, faster alternative",
      description:
        "Compare lawn and Frame.io. Flat $5/month pricing vs per-seat billing. Unlimited seats, instant playback, open source. See why teams are switching.",
      path: "/compare/frameio",
      ogImage: "/og/compare-frameio.png",
    }),
  component: CompareFrameio,
});
