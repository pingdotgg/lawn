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
    <div className="h-full flex bg-[#f0f0e8]">
      {/* Sidebar */}
      <aside className="w-16 border-r-2 border-[#1a1a1a] bg-[#f0f0e8] flex flex-col items-center py-4">
        {/* Logo */}
        <Link href="/dashboard" className="mb-8">
          <span className="text-lg font-black">l</span>
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
                  "w-10 h-10 flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-[#1a1a1a] text-[#f0f0e8]"
                    : "text-[#888] hover:bg-[#e8e8e0] hover:text-[#1a1a1a]"
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
                avatarBox: "w-9 h-9 rounded-none",
                userButtonPopoverCard: "bg-[#f0f0e8] border-2 border-[#1a1a1a] rounded-none shadow-none",
                userButtonPopoverActionButton: "text-[#1a1a1a] hover:bg-[#e8e8e0] rounded-none",
                userButtonPopoverActionButtonText: "text-[#1a1a1a]",
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
