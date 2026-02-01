"use client";

import Link from "next/link";

// Design 9: Blueprint/Technical
// Dark with light line work, architectural drawing aesthetic
// Green only for annotations and key data points

export default function Homepage9() {
  return (
    <div className="min-h-screen bg-[#0c0c0f] text-[#a0a0a8] font-mono">
      {/* Blueprint grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #2a2a35 1px, transparent 1px),
            linear-gradient(to bottom, #2a2a35 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Technical corner markers */}
      <div className="fixed top-4 left-4 w-8 h-8 border-l border-t border-[#3a3a45]" />
      <div className="fixed top-4 right-4 w-8 h-8 border-r border-t border-[#3a3a45]" />
      <div className="fixed bottom-4 left-4 w-8 h-8 border-l border-b border-[#3a3a45]" />
      <div className="fixed bottom-4 right-4 w-8 h-8 border-r border-b border-[#3a3a45]" />

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-[#2a2a35]">
        <div className="flex items-center gap-4">
          <span className="text-xl tracking-wider text-[#e0e0e8]">LAWN</span>
          <span className="text-xs text-[#4a4a55]">v2.4.1</span>
        </div>
        <nav className="flex items-center gap-8 text-xs tracking-wider">
          <Link href="/docs" className="hover:text-[#e0e0e8] transition-colors">
            DOCUMENTATION
          </Link>
          <Link href="/sign-in" className="hover:text-[#e0e0e8] transition-colors">
            SIGN IN
          </Link>
          <Link
            href="/sign-up"
            className="border border-[#7cb87c] text-[#7cb87c] px-4 py-2 hover:bg-[#7cb87c] hover:text-[#0c0c0f] transition-colors"
          >
            START TRIAL
          </Link>
        </nav>
      </header>

      {/* Main technical drawing area */}
      <main className="relative z-10 px-8 py-16">
        {/* Title block - like a blueprint title */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="border border-[#2a2a35] p-6 inline-block">
            <div className="text-xs text-[#4a4a55] mb-1">PROJECT TITLE</div>
            <h1 className="text-4xl sm:text-5xl text-[#e0e0e8] tracking-tight">
              VIDEO REVIEW SYSTEM
            </h1>
            <div className="text-xs text-[#4a4a55] mt-2">REV. 2.4 | SUPERSEDES: FRAME.IO</div>
          </div>
        </div>

        {/* Main comparison diagram */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left: Frame.io (deprecated) */}
            <div className="border border-[#2a2a35] border-dashed opacity-50 relative">
              <div className="absolute -top-3 left-4 bg-[#0c0c0f] px-2 text-xs text-red-400">
                DEPRECATED
              </div>
              <div className="p-8">
                <div className="text-xs text-[#4a4a55] mb-4">LEGACY SYSTEM: FRAME.IO</div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">ANNUAL COST (PER EDITOR)</span>
                    <span className="text-xl line-through">$228.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">TEAM OF 5</span>
                    <span className="text-xl line-through">$1,140.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">PRICING MODEL</span>
                    <span>PER-SEAT</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">VENDOR LOCK-IN</span>
                    <span>ADOBE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Lawn (current) */}
            <div className="border border-[#7cb87c] relative">
              <div className="absolute -top-3 left-4 bg-[#0c0c0f] px-2 text-xs text-[#7cb87c]">
                CURRENT SPEC
              </div>
              <div className="p-8">
                <div className="text-xs text-[#7cb87c] mb-4">SYSTEM: LAWN</div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">MONTHLY COST (FLAT)</span>
                    <span className="text-xl text-[#7cb87c]">$5.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">TEAM OF ∞</span>
                    <span className="text-xl text-[#7cb87c]">$5.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">PRICING MODEL</span>
                    <span className="text-[#7cb87c]">FLAT RATE</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#2a2a35]">
                    <span className="text-xs">VENDOR LOCK-IN</span>
                    <span className="text-[#7cb87c]">NONE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Annotation arrow */}
          <div className="flex justify-center my-8">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[#4a4a55]">SAVINGS (5 USERS, ANNUAL)</span>
              <span className="w-16 border-t border-dashed border-[#7cb87c]" />
              <span className="text-2xl text-[#7cb87c]">$1,080.00</span>
            </div>
          </div>
        </div>

        {/* Technical specifications */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="border border-[#2a2a35] p-8">
            <div className="text-xs text-[#4a4a55] mb-6">TECHNICAL SPECIFICATIONS</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: "COMMENT PRECISION", value: "FRAME-EXACT", unit: null },
                { label: "AVG. RESPONSE TIME", value: "0.3", unit: "SECONDS" },
                { label: "MAX TEAM SIZE", value: "∞", unit: "USERS" },
                { label: "VIDEO FORMATS", value: "ALL", unit: "SUPPORTED" },
              ].map((spec, i) => (
                <div key={i} className="border-l border-[#2a2a35] pl-4">
                  <div className="text-xs text-[#4a4a55] mb-2">{spec.label}</div>
                  <div className="text-3xl text-[#e0e0e8]">{spec.value}</div>
                  {spec.unit && (
                    <div className="text-xs text-[#4a4a55] mt-1">{spec.unit}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Installation/Getting Started */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="border border-[#2a2a35] p-8">
            <div className="text-xs text-[#4a4a55] mb-6">INSTALLATION PROCEDURE</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: "01", label: "UPLOAD", desc: "DRAG VIDEO FILE INTO BROWSER" },
                { step: "02", label: "SHARE", desc: "DISTRIBUTE LINK TO TEAM" },
                { step: "03", label: "REVIEW", desc: "CLICK ANY FRAME TO COMMENT" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-4xl text-[#2a2a35]">{item.step}</div>
                  <div>
                    <div className="text-sm text-[#e0e0e8] mb-1">{item.label}</div>
                    <div className="text-xs text-[#4a4a55]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-6xl mx-auto text-center">
          <div className="border border-[#2a2a35] p-12 inline-block">
            <div className="text-xs text-[#4a4a55] mb-4">INITIATE SYSTEM</div>
            <Link
              href="/sign-up"
              className="inline-block bg-[#7cb87c] text-[#0c0c0f] px-12 py-4 text-sm tracking-wider font-bold hover:bg-[#a0d0a0] transition-colors"
            >
              BEGIN FREE TRIAL
            </Link>
            <div className="text-xs text-[#4a4a55] mt-4">
              $5/MONTH AFTER TRIAL • UNLIMITED SEATS
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#2a2a35] px-8 py-6 mt-16">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-xs text-[#4a4a55]">
          <span>© 2025 LAWN SYSTEMS</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:text-[#a0a0a8]">GITHUB</Link>
            <Link href="/docs" className="hover:text-[#a0a0a8]">DOCS</Link>
            <Link href="/privacy" className="hover:text-[#a0a0a8]">PRIVACY</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
