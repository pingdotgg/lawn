"use client";

import { useState } from "react";
import Link from "next/link";

// Design 4: Geometric/Grid
// Sharp lines, strong grid, structured layout, architectural feel

export default function Homepage4() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#060906] text-[#c8e6c8]">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1a2a1a 1px, transparent 1px),
            linear-gradient(to bottom, #1a2a1a 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: 0.3,
        }}
      />

      {/* Diagonal accent line */}
      <div
        className="fixed top-0 right-0 w-[1px] h-[200vh] bg-gradient-to-b from-[#7cb87c] via-[#7cb87c]/20 to-transparent origin-top-right pointer-events-none"
        style={{ transform: "rotate(-30deg) translateX(50vw)" }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a2a1a]">
        <div className="flex items-center h-16">
          <div className="w-[240px] h-full flex items-center px-8 border-r border-[#1a2a1a]">
            <Link href="/" className="text-xl font-bold tracking-[-0.05em]">
              LAWN
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-between px-8">
            <nav className="flex gap-8">
              {["features", "pricing", "docs", "github"].map((item) => (
                <Link
                  key={item}
                  href={`/${item}`}
                  className="text-xs uppercase tracking-widest text-[#6a9a6a] hover:text-[#7cb87c] transition-colors"
                >
                  {item}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-6">
              <Link
                href="/sign-in"
                className="text-xs uppercase tracking-widest text-[#6a9a6a] hover:text-[#7cb87c] transition-colors"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                className="text-xs uppercase tracking-widest px-6 py-2 bg-[#7cb87c] text-[#060906] hover:bg-[#a0d0a0] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex min-h-screen pt-16">
        {/* Left sidebar - version/status */}
        <aside className="w-[240px] border-r border-[#1a2a1a] flex-shrink-0">
          <div className="sticky top-16 p-8">
            <div className="space-y-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#4a6a4a] mb-2">
                  Version
                </div>
                <div className="text-sm font-mono">2.4.1</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#4a6a4a] mb-2">
                  Status
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#7cb87c] animate-pulse" />
                  <span className="text-sm font-mono">Operational</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#4a6a4a] mb-2">
                  License
                </div>
                <div className="text-sm font-mono">MIT</div>
              </div>
              <div className="pt-8 border-t border-[#1a2a1a]">
                <div className="text-xs uppercase tracking-widest text-[#4a6a4a] mb-4">
                  Quick Stats
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6a9a6a]">Stars</span>
                    <span className="font-mono">12.4k</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6a9a6a]">Forks</span>
                    <span className="font-mono">892</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6a9a6a]">Users</span>
                    <span className="font-mono">45k+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {/* Hero */}
          <section className="min-h-[calc(100vh-4rem)] flex flex-col justify-center p-16 border-b border-[#1a2a1a]">
            <div className="max-w-4xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 max-w-[80px] bg-[#7cb87c]" />
                <span className="text-xs uppercase tracking-widest text-[#7cb87c]">
                  Video Review Platform
                </span>
              </div>

              <h1 className="text-6xl lg:text-8xl font-bold leading-[0.95] tracking-[-0.04em] mb-8">
                Precision
                <br />
                <span className="text-[#7cb87c]">feedback</span>
                <br />
                for video
              </h1>

              <p className="text-lg text-[#6a9a6a] max-w-lg mb-12 leading-relaxed">
                Frame-accurate comments. Lightning-fast interface.
                Open-source and free forever. The anti-Frame.io.
              </p>

              <div className="flex items-center gap-8">
                <Link
                  href="/sign-up"
                  className="group flex items-center gap-4 text-sm uppercase tracking-widest"
                >
                  <span className="px-8 py-4 bg-[#7cb87c] text-[#060906] group-hover:bg-[#a0d0a0] transition-colors">
                    Get Started
                  </span>
                  <span className="w-12 h-12 border border-[#7cb87c] flex items-center justify-center group-hover:bg-[#7cb87c] group-hover:text-[#060906] transition-all">
                    →
                  </span>
                </Link>
                <Link
                  href="/docs"
                  className="text-sm uppercase tracking-widest text-[#6a9a6a] hover:text-[#7cb87c] transition-colors"
                >
                  Documentation
                </Link>
              </div>
            </div>
          </section>

          {/* Features grid */}
          <section className="grid grid-cols-2 border-b border-[#1a2a1a]">
            {[
              {
                num: "01",
                title: "Frame Accuracy",
                desc: "Comments attach to exact frames, not vague timestamps. Scrub to any comment instantly.",
              },
              {
                num: "02",
                title: "Speed First",
                desc: "Built by a creator frustrated with slow tools. Every interaction under 300ms.",
              },
              {
                num: "03",
                title: "Self-Hostable",
                desc: "Run on your own infrastructure. Complete data ownership and privacy control.",
              },
              {
                num: "04",
                title: "Simple Pricing",
                desc: "$5/month flat. No per-seat fees, no tiered pricing, no enterprise upsells.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`p-12 border-[#1a2a1a] transition-colors cursor-default ${
                  i % 2 === 0 ? "border-r" : ""
                } ${i < 2 ? "border-b" : ""} ${
                  hoveredFeature === i ? "bg-[#0d150d]" : ""
                }`}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="flex items-start gap-8">
                  <span
                    className={`text-5xl font-bold transition-colors ${
                      hoveredFeature === i ? "text-[#7cb87c]" : "text-[#1a3a1a]"
                    }`}
                  >
                    {feature.num}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-[#6a9a6a] leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Comparison section */}
          <section className="p-16 border-b border-[#1a2a1a]">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 max-w-[80px] bg-[#7cb87c]" />
              <span className="text-xs uppercase tracking-widest text-[#7cb87c]">
                Comparison
              </span>
            </div>

            <div className="grid grid-cols-3 gap-px bg-[#1a2a1a]">
              {/* Header row */}
              <div className="bg-[#060906] p-6">
                <span className="text-xs uppercase tracking-widest text-[#4a6a4a]">
                  Feature
                </span>
              </div>
              <div className="bg-[#060906] p-6 text-center">
                <span className="text-xs uppercase tracking-widest text-[#4a6a4a]">
                  Frame.io
                </span>
              </div>
              <div className="bg-[#0d150d] p-6 text-center">
                <span className="text-xs uppercase tracking-widest text-[#7cb87c]">
                  Lawn
                </span>
              </div>

              {/* Data rows */}
              {[
                ["Annual Cost", "$228/editor", "$60 total"],
                ["Per-Seat Pricing", "Yes", "No"],
                ["5 Team Members", "$1,140/yr", "$60/yr"],
                ["Frame Accurate", "Yes", "Yes"],
                ["Adobe Lock-in", "Yes", "No"],
              ].map((row, i) => (
                <>
                  <div key={`feature-${i}`} className="bg-[#060906] p-6 text-sm">
                    {row[0]}
                  </div>
                  <div key={`frameio-${i}`} className="bg-[#060906] p-6 text-center text-sm text-[#6a9a6a]">
                    {row[1]}
                  </div>
                  <div key={`lawn-${i}`} className="bg-[#0d150d] p-6 text-center text-sm font-medium">
                    {row[2]}
                  </div>
                </>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="p-16">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold tracking-[-0.02em] mb-4">
                  Start reviewing today
                </h2>
                <p className="text-[#6a9a6a]">
                  $5/month. Unlimited team members. No per-seat pricing.
                </p>
              </div>
              <Link
                href="/sign-up"
                className="flex items-center gap-4 text-sm uppercase tracking-widest"
              >
                <span className="px-8 py-4 bg-[#7cb87c] text-[#060906] hover:bg-[#a0d0a0] transition-colors">
                  Create Account
                </span>
              </Link>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1a2a1a]">
        <div className="flex">
          <div className="w-[240px] p-8 border-r border-[#1a2a1a]">
            <span className="text-xl font-bold tracking-[-0.05em]">LAWN</span>
          </div>
          <div className="flex-1 p-8 flex justify-between items-center">
            <span className="text-xs text-[#4a6a4a]">
              © 2025 Lawn. MIT License.
            </span>
            <div className="flex gap-8 text-xs uppercase tracking-widest text-[#6a9a6a]">
              <Link href="/github" className="hover:text-[#7cb87c]">GitHub</Link>
              <Link href="/twitter" className="hover:text-[#7cb87c]">Twitter</Link>
              <Link href="/discord" className="hover:text-[#7cb87c]">Discord</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
