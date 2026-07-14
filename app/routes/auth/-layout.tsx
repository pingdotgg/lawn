import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

function alternateAuthHref(pathname: "/sign-in" | "/sign-up", search: string) {
  const redirectUrl = new URLSearchParams(search).get("redirect_url");
  if (!redirectUrl) {
    return pathname;
  }
  return `${pathname}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export function AuthShell({ children }: { children: ReactNode }) {
  const { pathname, searchStr } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      searchStr: state.location.searchStr,
    }),
  });
  const isSignUp = pathname.startsWith("/sign-up");

  return (
    <div
      data-theme="light"
      className="auth-shell relative flex min-h-screen flex-col items-center justify-center bg-[#f0f0e8]"
    >
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(#1a1a1a 1px, transparent 1px),
            linear-gradient(90deg, #1a1a1a 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <span className="text-4xl font-black text-[#1a1a1a]">lawn</span>
          </Link>
          <p className="mt-3 text-sm text-[#888]">Video collaboration, simplified</p>
        </div>
        {children}
        <p className="auth-footer mt-6 text-center text-sm">
          {isSignUp ? (
            <>
              <span className="auth-footer-text">Already have an account?</span>{" "}
              <Link to={alternateAuthHref("/sign-in", searchStr)} className="auth-footer-link">
                Sign in
              </Link>
            </>
          ) : (
            <>
              <span className="auth-footer-text">Don&apos;t have an account?</span>{" "}
              <Link to={alternateAuthHref("/sign-up", searchStr)} className="auth-footer-link">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthShell;
