import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { NotFound } from "@/components/ui/NotFound";
import appCss from "../app.css?url";
import geistMonoLatin from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "lawn — video review for creative teams" },
      {
        name: "description",
        content:
          "Video review and collaboration for creative teams. Frame-accurate comments, unlimited seats, $5/month flat. The open source Frame.io alternative.",
      },
      { property: "og:site_name", content: "lawn" },
      { name: "twitter:site", content: "@theo" },
    ],
    links: [
      {
        rel: "preload",
        href: geistMonoLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/grass-logo.svg?v=4" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=4" },
      { rel: "shortcut icon", href: "/favicon.ico?v=4" },
    ],
  }),
  component: RootComponent,
  errorComponent: ({ error }) => {
    return (
      <main className="container mx-auto p-4 pt-16">
        <h1>Error</h1>
        <p>{error instanceof Error ? error.message : "An unexpected error occurred."}</p>
        {import.meta.env.DEV && error instanceof Error && error.stack ? (
          <pre className="w-full overflow-x-auto p-4">
            <code>{error.stack}</code>
          </pre>
        ) : null}
      </main>
    );
  },
  notFoundComponent: () => <NotFound />,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="h-full antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <Scripts />
      </body>
    </html>
  );
}
