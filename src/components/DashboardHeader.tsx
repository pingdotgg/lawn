import { Link } from "@tanstack/react-router";
import { UserButton } from "@clerk/tanstack-react-start";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeToggle";
import React from "react";

function ThemeToggleButton() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#1a1a1a] hover:bg-[#e8e8e0] transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (⌘⇧L)`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export type PathSegment = {
  label: React.ReactNode;
  href?: string;
};

export function DashboardHeader({ 
  children,
  paths = [],
}: { 
  children?: React.ReactNode;
  paths?: PathSegment[];
}) {
  return (
    <header className="flex-shrink-0 border-b-2 border-[#1a1a1a] bg-[#f0f0e8] flex items-center px-6 h-14 w-full">
      <div className="flex items-center text-xl font-black tracking-tighter text-[#1a1a1a] min-w-0 flex-shrink">
        <Link to="/dashboard" className="hover:text-[#2d5a2d] transition-colors mr-2">
          lawn.
        </Link>
        {paths.map((path, index) => (
          <div key={index} className="flex items-center min-w-0 flex-shrink">
            <span className="text-[#888] mr-2 flex-shrink-0">/</span>
            {path.href ? (
              <Link to={path.href} className="hover:text-[#2d5a2d] transition-colors truncate mr-2">
                {path.label}
              </Link>
            ) : (
              <div className="truncate flex items-center gap-3">
                {path.label}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex-1 min-w-0 flex items-center justify-end gap-3 pl-4">
        {children}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 ml-4 pl-4 border-l-2 border-[#1a1a1a]/10 h-8">
        <ThemeToggleButton />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8 rounded-none border-2 border-[#1a1a1a]",
              userButtonPopoverCard: "bg-[#f0f0e8] border-2 border-[#1a1a1a] rounded-none shadow-[8px_8px_0px_0px_var(--shadow-color)]",
              userButtonPopoverActionButton: "text-[#1a1a1a] hover:bg-[#e8e8e0] rounded-none",
              userButtonPopoverActionButtonText: "text-[#1a1a1a] font-mono font-bold",
              userButtonPopoverFooter: "hidden",
            },
          }}
        />
      </div>
    </header>
  );
}
