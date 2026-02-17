import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "./auth/-layout";
import SignInPage from "./auth/-sign-in";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_url:
      typeof search.redirect_url === "string" ? search.redirect_url : undefined,
  }),
  component: SignInRoute,
});

function SignInRoute() {
  return (
    <AuthShell>
      <SignInPage />
    </AuthShell>
  );
}
