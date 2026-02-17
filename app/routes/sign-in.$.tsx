import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "./auth/-layout";
import SignInPage from "./auth/-sign-in";

export const Route = createFileRoute("/sign-in/$")({
  component: SignInRoute,
});

function SignInRoute() {
  return (
    <AuthShell>
      <SignInPage />
    </AuthShell>
  );
}
