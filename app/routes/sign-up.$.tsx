import { createFileRoute } from "@tanstack/react-router";
import { ClerkClientProvider } from "@/lib/clerk";
import { AuthShell } from "./auth/-layout";
import SignUpPage from "./auth/-sign-up";

export const Route = createFileRoute("/sign-up/$")({
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
