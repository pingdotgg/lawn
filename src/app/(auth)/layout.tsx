import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0908] relative">
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="w-full max-w-md p-8 relative z-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xl font-medium text-white">ReviewFlow</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
