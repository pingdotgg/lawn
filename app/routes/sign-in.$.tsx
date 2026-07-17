import { createFileRoute } from "@tanstack/react-router";
import { ClerkClientProvider } from "@/lib/clerk";
import { AuthShell } from "./auth/-layout";
import SignInPage from "./auth/-sign-in";

export const Route = createFileRoute("/sign-in/$")({
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
