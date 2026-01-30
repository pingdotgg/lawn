import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReviewFlow - Video Review & Collaboration",
  description: "Video review and collaboration platform for indie creators and small teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className={`${inter.className} h-full antialiased`}>
          <ConvexClientProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
