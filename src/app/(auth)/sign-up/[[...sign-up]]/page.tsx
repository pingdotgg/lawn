import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "bg-[#141210] border border-white/10 shadow-none rounded-2xl",
          headerTitle: "text-white",
          headerSubtitle: "text-white/50",
          socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
          socialButtonsBlockButtonText: "text-white",
          dividerLine: "bg-white/10",
          dividerText: "text-white/40",
          formFieldLabel: "text-white/60",
          formFieldInput: "bg-white/5 border-white/10 text-white rounded-lg",
          formButtonPrimary: "bg-red-500 hover:bg-red-400 text-white rounded-full",
          footerActionLink: "text-red-500 hover:text-red-400",
          identityPreviewEditButton: "text-red-500",
        },
        variables: {
          colorPrimary: "#ef4444",
          colorBackground: "#141210",
          colorInputBackground: "rgba(255, 255, 255, 0.05)",
          colorInputText: "#fafafa",
        },
      }}
    />
  );
}
