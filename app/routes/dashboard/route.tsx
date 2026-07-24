import { createFileRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme/ThemeToggle";
import { ClerkConvexProvider } from "@/lib/convex";
import { convexConnectionLinks, seoHead } from "@/lib/seo";
import DashboardLayout from "./-layout";

export const Route = createFileRoute("/dashboard")({
  head: () => {
    const head = seoHead({
      title: "Dashboard",
      description: "Manage your video projects on lawn.",
      path: "/dashboard",
      noIndex: true,
    });

    return { ...head, links: [...head.links, ...convexConnectionLinks()] };
  },
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <ClerkConvexProvider>
      <ThemeProvider>
        <DashboardLayout />
      </ThemeProvider>
    </ClerkConvexProvider>
  );
}
