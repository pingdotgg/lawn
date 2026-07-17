import { Link } from "@tanstack/react-router";

export function MarketingNav() {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b-2 border-[#1a1a1a] bg-[#f0f0e8] px-6 py-4 text-[#1a1a1a] transition-all duration-200">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-black tracking-tighter">
          lawn.
        </Link>
      </div>
      <div className="flex items-center gap-6 text-sm font-bold tracking-wide uppercase">
        <Link to="/pricing" className="hidden underline-offset-4 hover:underline sm:block">
          Pricing
        </Link>
        <Link to="/compare/frameio" className="hidden underline-offset-4 hover:underline sm:block">
          Compare
        </Link>
        <Link to="/sign-in" className="underline-offset-4 hover:underline">
          Log in
        </Link>
        <Link
          to="/sign-up"
          className="border-2 border-[#1a1a1a] px-4 py-2 transition-colors hover:bg-[#1a1a1a] hover:text-[#f0f0e8]"
        >
          Start
        </Link>
      </div>
    </nav>
  );
}
