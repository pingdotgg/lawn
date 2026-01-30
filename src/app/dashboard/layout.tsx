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
    <div className="h-full flex bg-zinc-950">
      {/* Sidebar - Compact, icon-focused */}
      <aside className="w-16 border-r border-zinc-800/50 bg-zinc-900/30 flex flex-col items-center py-4">
        {/* Logo */}
        <Link href="/dashboard" className="mb-6 group">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <svg
              className="w-5 h-5 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
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
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
                title={item.label}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </Link>
            ))}
          </nav>
        )}

        {/* User */}
        <div className="mt-auto pt-4 border-t border-zinc-800/50 w-full flex justify-center">
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
      <main className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
