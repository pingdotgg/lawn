"use client";

export const dynamic = "force-dynamic";

import { useUserSync } from "@/hooks/useUserSync";
import { UserButton } from "@clerk/nextjs";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Folder, Settings } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useUserSync();
  const params = useParams();
  const pathname = usePathname();
  const teamSlug = params.teamSlug as string | undefined;

  const navItems = teamSlug
    ? [
        { href: `/dashboard/${teamSlug}`, icon: Folder, label: "Projects" },
        { href: `/dashboard/${teamSlug}/settings`, icon: Settings, label: "Settings" },
      ]
    : [];

  return (
    <div className="h-full flex bg-[#0a0908]">
      {/* Sidebar - Compact, icon-focused */}
      <aside className="w-16 border-r border-white/5 bg-[#0e0c0a] flex flex-col items-center py-4">
        {/* Logo */}
        <Link href="/dashboard" className="mb-6 group">
          <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center group-hover:bg-red-400 transition-colors">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </Link>

        {/* Team Switcher */}
        <div className="mb-4">
          <TeamSwitcher compact />
        </div>

        {/* Navigation */}
        {teamSlug && (
          <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  pathname === item.href
                    ? "bg-red-500/10 text-red-500"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
                title={item.label}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </Link>
            ))}
          </nav>
        )}

        {/* User */}
        <div className="mt-auto pt-4 border-t border-white/5 w-full flex justify-center">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </div>
      </aside>

      {/* Main content - Full width */}
      <main className="flex-1 overflow-auto bg-[#0a0908]">
        {children}
      </main>
    </div>
  );
}
