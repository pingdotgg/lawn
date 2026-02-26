import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import PricingPage from "./-pricing";

export const Route = createFileRoute("/pricing")({
  head: () =>
    seoHead({
      title: "Pricing — $5/month, unlimited seats",
      description:
        "lawn pricing is simple. $5/month for unlimited seats, projects, and clients. $25/month if you need more storage. No per-user fees.",
      path: "/pricing",
      ogImage: "/og/pricing.png",
    }),
  component: PricingPage,
});
