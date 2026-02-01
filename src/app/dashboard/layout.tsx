"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, FolderOpen, Settings, Users } from "lucide-react";

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const pathname = usePathname();

  return (
    <div className="h-full flex bg-[#0d1a0d]">
      {/* Sidebar */}
      <aside className="w-16 border-r border-[#1a3a1a] bg-[#0a150a] flex flex-col items-center py-4">
        {/* Logo */}
        <Link href="/dashboard" className="mb-8">
          <div className="w-9 h-9 rounded-full bg-[#2d5a2d] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7cb87c" strokeWidth="2">
              <path d="M12 3v18M5 10c0-4 3-7 7-7s7 3 7 7" strokeLinecap="round" />
            </svg>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-[#2d5a2d] text-[#7cb87c]"
                    : "text-[#4a6a4a] hover:bg-[#1a2a1a] hover:text-[#6a9a6a]"
                )}
                title={item.name}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="mt-auto">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
                userButtonPopoverCard: "bg-[#0f1f0f] border-[#2a4a2a]",
                userButtonPopoverActionButton: "text-[#c8e6c8] hover:bg-[#1a2a1a]",
                userButtonPopoverActionButtonText: "text-[#c8e6c8]",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
