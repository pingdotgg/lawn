import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { NotFound } from "@/components/ui/NotFound";

function DefaultPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8]">
      <div className="text-[#888]">Loading...</div>
    </div>
  );
}

function DefaultNotFound() {
  return <NotFound />;
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPendingComponent: DefaultPending,
    defaultNotFoundComponent: DefaultNotFound,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
