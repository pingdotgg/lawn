import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";
import { AuthShell } from "./auth/-layout";
import SignInPage from "./auth/-sign-in";

export const Route = createFileRoute("/sign-in")({
  head: () =>
    seoHead({
      title: "Sign in",
      description: "Sign in to your lawn account.",
      path: "/sign-in",
      noIndex: true,
    }),
  validateSearch: (search: Record<string, unknown>): { redirect_url?: string } =>
    typeof search.redirect_url === "string" ? { redirect_url: search.redirect_url } : {},
  component: SignInRoute,
});

function SignInRoute() {
  return (
    <AuthShell>
      <SignInPage />
    </AuthShell>
  );
}
