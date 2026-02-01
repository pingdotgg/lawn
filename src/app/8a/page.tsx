"use client";

import Link from "next/link";

// Design 8a: Deconstructed - Stacked Blocks
// Same energy but with overlapping solid blocks, more vertical rhythm

export default function Homepage8a() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee] overflow-x-hidden">
      {/* Nav - minimal, tucked away */}
      <nav className="relative z-20 p-6 flex justify-between items-center">
        <span className="text-2xl font-black tracking-tighter transform -rotate-2">lawn</span>
        <div className="flex gap-4 text-sm">
          <Link href="/sign-in" className="hover:text-[#7cb87c] underline underline-offset-4">
            login
          </Link>
          <Link
            href="/sign-up"
            className="bg-[#eee] text-[#111] px-4 py-2 font-bold hover:bg-[#7cb87c] transition-colors"
          >
            sign up
          </Link>
        </div>
      </nav>

      {/* Hero - stacked blocks */}
      <section className="relative z-10 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Main message as stacked blocks */}
          <div className="space-y-4">
            <div className="bg-[#eee] text-[#111] p-6 inline-block transform -rotate-1">
              <span className="text-6xl sm:text-8xl font-black tracking-tighter">FRAME.IO</span>
            </div>

            <div className="ml-[10vw]">
              <div className="bg-[#222] p-4 inline-block transform rotate-1">
                <span className="text-3xl sm:text-5xl font-black tracking-tighter text-[#666]">IS GETTING</span>
              </div>
            </div>

            <div className="ml-[5vw]">
              <div className="bg-[#eee] text-[#111] p-6 inline-block transform -rotate-2">
                <span className="text-6xl sm:text-8xl font-black tracking-tighter">EXPENSIVE</span>
              </div>
            </div>
          </div>

          {/* Price comparison - floating blocks */}
          <div className="mt-16 relative">
            <div className="inline-block transform rotate-2">
              <div className="border-2 border-[#333] p-6 line-through opacity-40">
                <div className="text-xs mb-1">FRAME.IO</div>
                <div className="text-4xl font-black">$228/yr</div>
                <div className="text-xs mt-1">per editor</div>
              </div>
            </div>

            <div className="inline-block ml-8 transform -rotate-3">
              <div className="bg-[#7cb87c] text-[#111] p-6">
                <div className="text-xs mb-1 font-bold">LAWN</div>
                <div className="text-5xl font-black">$5/mo</div>
                <div className="text-xs mt-1">unlimited seats</div>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p className="mt-16 text-xl max-w-lg transform -rotate-1">
            Built by a creator who got tired of waiting.
            <span className="text-[#7cb87c]"> Now you don't have to either.</span>
          </p>
        </div>
      </section>

      {/* Features - scattered blocks */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: "FRAME ACCURATE", desc: "Click the exact frame", rotate: "-2deg", bg: "#eee", text: "#111" },
              { title: "UNLIMITED SEATS", desc: "$5 covers everyone", rotate: "1deg", bg: "#222", text: "#eee" },
              { title: "FAST AS HELL", desc: "0.3s response time", rotate: "-1deg", bg: "#222", text: "#eee" },
              { title: "NO ADOBE", desc: "Works with anything", rotate: "2deg", bg: "#eee", text: "#111" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 transition-transform hover:scale-105"
                style={{ transform: `rotate(${item.rotate})`, backgroundColor: item.bg, color: item.text }}
              >
                <div className="text-2xl font-black mb-2">{item.title}</div>
                <div className="text-sm opacity-70">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Math section */}
      <section className="relative z-10 px-6 py-24 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-black mb-12 transform -rotate-1">THE MATH</h2>

          <div className="space-y-6 font-mono text-xl sm:text-2xl">
            <div className="flex flex-wrap items-center gap-4 transform rotate-1">
              <span className="text-[#666]">frame.io × 5 editors</span>
              <span className="text-[#666]">=</span>
              <span className="line-through text-[#666]">$1,140/yr</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 transform -rotate-1">
              <span className="text-[#666]">lawn × ∞ editors</span>
              <span className="text-[#666]">=</span>
              <span className="text-[#7cb87c] font-black">$60/yr</span>
            </div>
            <div className="pt-8 border-t border-[#333] transform rotate-1">
              <span className="text-[#666]">savings</span>
              <span className="text-[#7cb87c] font-black text-5xl ml-4">$1,080</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block">
            <div className="bg-[#eee] text-[#111] p-8 transform -rotate-2 hover:rotate-0 transition-transform">
              <h2 className="text-5xl sm:text-7xl font-black mb-6">TRY LAWN</h2>
              <Link
                href="/sign-up"
                className="inline-block bg-[#111] text-[#eee] px-12 py-4 text-xl font-black hover:bg-[#7cb87c] transition-colors"
              >
                START FREE TRIAL →
              </Link>
            </div>
          </div>
          <p className="mt-8 text-sm text-[#666]">$5/month • unlimited seats • no tricks</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#333] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-[#666]">
          <span>© 2025</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:text-[#eee]">github</Link>
            <Link href="/docs" className="hover:text-[#eee]">docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
