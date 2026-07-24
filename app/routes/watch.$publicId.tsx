import { createFileRoute } from "@tanstack/react-router";
import { ClerkConvexProvider } from "@/lib/convex";
import { convexConnectionLinks, muxMediaLinks, seoHead } from "@/lib/seo";
import WatchPage from "./-watch";

export const Route = createFileRoute("/watch/$publicId")({
  head: () => {
    const head = seoHead({
      title: "Watch video",
      description: "Watch and review this video on lawn.",
      path: "/watch",
      noIndex: true,
    });

    return {
      ...head,
      links: [...head.links, ...convexConnectionLinks(), ...muxMediaLinks()],
    };
  },
  component: WatchRoute,
});

function WatchRoute() {
  return (
    <ClerkConvexProvider>
      <WatchPage />
    </ClerkConvexProvider>
  );
}
