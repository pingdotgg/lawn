import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          formButtonPrimary:
            "bg-[#2d5a2d] hover:bg-[#3a6a3a] text-[#c8e6c8] text-sm normal-case",
          card: "bg-[#0f1f0f] border border-[#2a4a2a] shadow-xl",
          headerTitle: "text-[#c8e6c8]",
          headerSubtitle: "text-[#a0c8a0]",
          socialButtonsBlockButton:
            "bg-[#1a2a1a] border-[#2a4a2a] hover:bg-[#243d24]",
          socialButtonsBlockButtonText: "!text-[#c8e6c8]",
          socialButtonsBlockButtonArrow: "text-[#c8e6c8]",
          formFieldLabel: "text-[#a0c8a0]",
          formFieldInput:
            "bg-[#1a2a1a] border-[#2a4a2a] text-[#c8e6c8] focus:border-[#7cb87c] focus:ring-[#7cb87c]/30",
          footerActionLink: "text-[#7cb87c] hover:text-[#a0d0a0]",
          footerActionText: "text-[#a0c8a0]",
          dividerLine: "bg-[#2a4a2a]",
          dividerText: "text-[#6a9a6a]",
          identityPreviewText: "text-[#c8e6c8]",
          identityPreviewEditButton: "text-[#7cb87c]",
          formFieldInputShowPasswordButton: "text-[#6a9a6a]",
          footer: "hidden",
          internal: "text-[#c8e6c8]",
        },
        variables: {
          colorPrimary: "#7cb87c",
          colorBackground: "#0f1f0f",
          colorInputBackground: "#1a2a1a",
          colorInputText: "#c8e6c8",
          colorText: "#c8e6c8",
          colorTextSecondary: "#a0c8a0",
          colorTextOnPrimaryBackground: "#0d1a0d",
          colorNeutral: "#c8e6c8",
          borderRadius: "0.375rem",
        },
      }}
    />
  );
}
