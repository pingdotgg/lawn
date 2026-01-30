import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "bg-zinc-900/50 border border-zinc-800/50 shadow-none",
          headerTitle: "text-zinc-100",
          headerSubtitle: "text-zinc-400",
          socialButtonsBlockButton: "bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700",
          socialButtonsBlockButtonText: "text-zinc-100",
          dividerLine: "bg-zinc-800",
          dividerText: "text-zinc-500",
          formFieldLabel: "text-zinc-400",
          formFieldInput: "bg-zinc-800 border-zinc-700 text-zinc-100",
          formButtonPrimary: "bg-amber-500 hover:bg-amber-400 text-zinc-950",
          footerActionLink: "text-amber-500 hover:text-amber-400",
          identityPreviewEditButton: "text-amber-500",
        },
        variables: {
          colorPrimary: "#f59e0b",
          colorBackground: "#18181b",
          colorInputBackground: "#27272a",
          colorInputText: "#fafafa",
        },
      }}
    />
  );
}
