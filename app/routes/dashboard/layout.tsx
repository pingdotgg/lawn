
import { UserButton } from "@clerk/react-router";
import { getAuth } from "@clerk/react-router/server";
import { useConvex } from "convex/react";
import type { ComponentType } from "react";

import {
  Outlet,
  Link,
  redirect,
  useLocation,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";
import { cn } from "@/lib/utils";
import { Home, FolderOpen, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeToggle";
import {
  dashboardHomePath,
  teamHomePath,
  teamSettingsPath,
} from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { prewarmDashboardIndex } from "./index.data";
import { prewarmSettings } from "./settings.data";
import { prewarmTeam } from "./team.data";

type DashboardNavItemProps = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  isActive: boolean;
  prewarm?: () => void | Promise<void>;
};

function DashboardNavItem({
  name,
  href,
  icon: Icon,
  disabled,
  isActive,
  prewarm,
}: DashboardNavItemProps) {
  const prewarmIntentHandlers = useRoutePrewarmIntent(() => prewarm?.());

  return (
    <Link
      to={href}
      prefetch="intent"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        "w-10 h-10 flex items-center justify-center transition-colors",
        disabled
          ? "text-[#c2c2b9] pointer-events-none"
          : isActive
          ? "bg-[#1a1a1a] text-[#f0f0e8]"
          : "text-[#888] hover:bg-[#e8e8e0] hover:text-[#1a1a1a]"
      )}
      title={name}
      {...prewarmIntentHandlers}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (userId) return null;

  const url = new URL(args.request.url);
  const redirectUrl = `${url.pathname}${url.search}`;
  throw redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
}

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

export default function DashboardLayout() {
  const pathname = useLocation().pathname;
  const params = useParams();
  const convex = useConvex();
  const teamSlug =
    typeof params.teamSlug === "string" ? params.teamSlug : undefined;
  const teamHome = teamSlug ? teamHomePath(teamSlug) : null;
  const settingsPath = teamSlug ? teamSettingsPath(teamSlug) : null;
  const prewarmHomeIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmDashboardIndex(convex),
  );

  const navigation = [
    {
      name: "Home",
      href: dashboardHomePath(),
      icon: Home,
      prewarm: () => prewarmDashboardIndex(convex),
      isActive: pathname === dashboardHomePath(),
    },
    {
      name: "Projects",
      href: teamHome ?? dashboardHomePath(),
      icon: FolderOpen,
      disabled: !teamHome,
      prewarm: teamSlug
        ? () => prewarmTeam(convex, { teamSlug })
        : undefined,
      isActive:
        !!teamHome &&
        (pathname === teamHome ||
          (pathname.startsWith(`${teamHome}/`) &&
            pathname !== settingsPath &&
            !pathname.startsWith(`${settingsPath}/`))),
    },
    {
      name: "Settings",
      href: settingsPath ?? dashboardHomePath(),
      icon: Settings,
      disabled: !settingsPath,
      prewarm: teamSlug
        ? () => prewarmSettings(convex, { teamSlug })
        : undefined,
      isActive:
        !!settingsPath &&
        (pathname === settingsPath || pathname.startsWith(`${settingsPath}/`)),
    },
  ];

  return (
    <div className="h-full flex bg-[#f0f0e8]">
      {/* Sidebar */}
      <aside className="w-16 border-r-2 border-[#1a1a1a] bg-[#f0f0e8] flex flex-col items-center py-4">
        {/* Logo */}
        <Link
          to={dashboardHomePath()}
          prefetch="intent"
          className="mb-8"
          {...prewarmHomeIntentHandlers}
        >
          <span className="text-lg font-black">l</span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navigation.map((item) => {
            return (
              <DashboardNavItem
                key={item.name}
                name={item.name}
                href={item.href}
                icon={item.icon}
                disabled={item.disabled}
                isActive={item.isActive}
                prewarm={item.prewarm}
              />
            );
          })}
        </nav>

        {/* User & Theme */}
        <div className="mt-auto flex flex-col items-center gap-3">
          <ThemeToggleButton />
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
        <Outlet />
      </main>
    </div>
  );
}
