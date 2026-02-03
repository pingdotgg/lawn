import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { ClerkProvider } from "@clerk/react-router";
import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";

import { ConvexClientProvider } from "@/lib/convex";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeToggle";
import "./app.css";

export const middleware = [clerkMiddleware()];

export async function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}

export const meta: MetaFunction = () => [
  { title: "lawn - video collaboration" },
  { name: "description", content: "Leave feedback exactly where it matters" },
];

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>();
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
  }

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
    <ClerkProvider loaderData={loaderData} publishableKey={publishableKey}>
      <html lang="en" className="h-full" suppressHydrationWarning>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body className="h-full antialiased">
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <ConvexClientProvider>
            <ThemeProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </ThemeProvider>
          </ConvexClientProvider>
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack ? (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
