import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = {
  title: "lawn - video collaboration",
  description: "Leave feedback exactly where it matters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (() => {
      try {
        const stored = localStorage.getItem("lawn-theme");
        if (stored === "light" || stored === "dark") {
          document.documentElement.setAttribute("data-theme", stored);
          return;
        }
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } catch {}
    })();
  `;

  return (
    <ClerkProvider>
      <html lang="en" className="h-full" suppressHydrationWarning>
        <body className="h-full antialiased">
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <ConvexClientProvider>
            <TooltipProvider>
              {children}
              <ThemeToggle />
            </TooltipProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
