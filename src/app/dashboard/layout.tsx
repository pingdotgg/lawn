"use client";

export const dynamic = "force-dynamic";

import { useUserSync } from "@/hooks/useUserSync";
import { UserButton } from "@clerk/nextjs";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Folder, Settings, Video } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-neutral-50 flex flex-col">
        <div className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 mb-6">
            <Video className="h-6 w-6" />
            <span className="font-semibold text-lg">ReviewFlow</span>
          </Link>
          <TeamSwitcher />
        </div>

        {teamSlug && (
          <>
            <Separator />
            <nav className="flex-1 p-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        pathname === item.href
                          ? "bg-neutral-200 text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-100"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}

        <div className="p-4 border-t mt-auto">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="text-sm text-neutral-600">Account</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}
