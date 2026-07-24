import { createFileRoute } from "@tanstack/react-router";
import { ClerkConvexProvider } from "@/lib/convex";
import { convexConnectionLinks, muxMediaLinks, seoHead } from "@/lib/seo";
import SharePage from "./-share";

export const Route = createFileRoute("/share/$token")({
  head: () => {
    const head = seoHead({
      title: "Shared video",
      description: "Review this shared video on lawn.",
      path: "/share",
      noIndex: true,
    });

    return {
      ...head,
      links: [...head.links, ...convexConnectionLinks(), ...muxMediaLinks()],
    };
  },
  component: ShareRoute,
});

function ShareRoute() {
  return (
    <ClerkConvexProvider>
      <SharePage />
    </ClerkConvexProvider>
  );
}
