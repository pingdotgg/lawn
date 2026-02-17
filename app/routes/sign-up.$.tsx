import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "./auth/-layout";
import SignUpPage from "./auth/-sign-up";

export const Route = createFileRoute("/sign-up/$")({
  component: SignUpRoute,
});

function SignUpRoute() {
  return (
    <AuthShell>
      <SignUpPage />
    </AuthShell>
  );
}
