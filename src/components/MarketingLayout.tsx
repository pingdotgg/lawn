import type { ReactNode } from "react";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";

const lightModeVars = {
  "--background": "#f0f0e8",
  "--background-alt": "#1a1a1a",
  "--surface": "#ffffff",
  "--surface-alt": "#e8e8e0",
  "--surface-strong": "#1a1a1a",
  "--surface-muted": "#d8d8d0",
  "--foreground": "#1a1a1a",
  "--foreground-muted": "#888888",
  "--foreground-subtle": "#aaaaaa",
  "--foreground-inverse": "#f0f0e8",
  "--border": "#1a1a1a",
  "--border-subtle": "#cccccc",
  "--accent": "#2d5a2d",
  "--accent-hover": "#3a6a3a",
  "--accent-light": "#7cb87c",
  "--shadow-color": "#1a1a1a",
  "--shadow-accent": "rgba(45,90,45,1)",
} as React.CSSProperties;

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen font-mono selection:bg-[#2d5a2d] selection:text-[#f0f0e8]"
      style={{
        ...lightModeVars,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <MarketingNav />
      <main className="pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
