import { createFileRoute } from "@tanstack/react-router";
import { ClerkClientProvider } from "@/lib/clerk";
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
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_url: typeof search.redirect_url === "string" ? search.redirect_url : undefined,
  }),
  component: SignInRoute,
});

function SignInRoute() {
  return (
    <ClerkClientProvider>
      <AuthShell>
        <SignInPage />
      </AuthShell>
    </ClerkClientProvider>
  );
}
