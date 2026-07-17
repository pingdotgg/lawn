import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import Homepage from "./-home";

export const Route = createFileRoute("/")({
  head: () => {
    const head = seoHead({
      title: "lawn — video review for creative teams",
      description:
        "Video review and collaboration for creative teams. Frame-accurate comments, unlimited seats, $5/month flat. The open source Frame.io alternative.",
      path: "/",
      ogImage: "/og/home.png",
    });

    return {
      ...head,
      links: [
        ...head.links,
        {
          rel: "preload",
          href: "/grassy-bg.avif",
          as: "image",
          type: "image/avif",
          fetchPriority: "high" as const,
        },
      ],
    };
  },
  component: Homepage,
});
