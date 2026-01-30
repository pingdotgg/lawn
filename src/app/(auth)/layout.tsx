import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="w-full max-w-md p-8 relative z-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-zinc-100">ReviewFlow</span>
          </Link>
          <p className="text-zinc-500 mt-3">Video review & collaboration</p>
        </div>
        {children}
      </div>
    </div>
  );
}
