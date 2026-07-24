import { createFileRoute } from "@tanstack/react-router";
import { ClerkClientProvider } from "@/lib/clerk";
import { seoHead } from "@/lib/seo";
import { AuthShell } from "./auth/-layout";
import SignUpPage from "./auth/-sign-up";

export const Route = createFileRoute("/sign-up")({
  head: () =>
    seoHead({
      title: "Start your free trial",
      description:
        "Sign up for lawn — video review for creative teams. $5/month flat, unlimited seats.",
      path: "/sign-up",
    }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_url: typeof search.redirect_url === "string" ? search.redirect_url : undefined,
  }),
  component: SignUpRoute,
});

function SignUpRoute() {
  return (
    <ClerkClientProvider>
      <AuthShell>
        <SignUpPage />
      </AuthShell>
    </ClerkClientProvider>
  );
}
