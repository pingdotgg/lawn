import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1a0d] relative">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 160, 100, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 160, 100, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2d5a2d] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7cb87c" strokeWidth="2">
                  <path d="M12 3v18M5 10c0-4 3-7 7-7s7 3 7 7" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-serif text-2xl text-[#7cb87c] italic">lawn</span>
            </div>
          </Link>
          <p className="mt-3 text-sm text-[#4a6a4a]">
            Video collaboration, simplified
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
