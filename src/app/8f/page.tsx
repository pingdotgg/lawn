"use client";

import Link from "next/link";

// Design 8f: Extreme Scale Contrast
// Massive type vs tiny type, visual tension through size

export default function Homepage8f() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center">
        <span className="text-sm font-bold tracking-widest">LAWN</span>
        <div className="flex gap-6 text-xs">
          <Link href="/sign-in" className="hover:text-[#7cb87c]">LOGIN</Link>
          <Link href="/sign-up" className="text-[#7cb87c] font-bold">START →</Link>
        </div>
      </nav>

      {/* Hero - extreme scale */}
      <section className="min-h-screen flex flex-col justify-center px-6 relative overflow-hidden">
        {/* Tiny label */}
        <div className="text-[10px] tracking-[0.3em] text-[#666] mb-4">
          VIDEO REVIEW SOFTWARE
        </div>

        {/* MASSIVE headline */}
        <h1 className="text-[28vw] font-black leading-[0.7] tracking-tighter -ml-[1vw]">
          <span className="block text-[#7cb87c]">$5</span>
        </h1>

        {/* Tiny subtext next to massive text */}
        <div className="flex items-end gap-8 -mt-[5vw] ml-[2vw]">
          <span className="text-[8vw] font-black text-[#333] leading-none">/mo</span>
          <div className="text-xs text-[#666] pb-[1vw]">
            <div>unlimited seats</div>
            <div>unlimited projects</div>
            <div>frame-accurate</div>
          </div>
        </div>

        {/* Comparison - tiny */}
        <div className="mt-16 text-xs text-[#666]">
          <span className="line-through">frame.io: $228/yr per editor</span>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <Link
            href="/sign-up"
            className="inline-block bg-[#eee] text-[#111] px-6 py-3 text-sm font-black hover:bg-[#7cb87c] transition-colors"
          >
            START FREE TRIAL
          </Link>
        </div>

        {/* Giant watermark */}
        <div className="absolute bottom-0 right-0 text-[50vw] font-black text-[#141414] leading-none pointer-events-none select-none translate-x-[10%] translate-y-[20%]">
          ∞
        </div>
      </section>

      {/* Features - scale contrast continues */}
      <section className="px-6 py-32 bg-[#0a0a0a] relative">
        <div className="max-w-6xl mx-auto">
          {/* Giant number, tiny label pattern */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            <div>
              <div className="text-[15vw] lg:text-[8vw] font-black leading-none text-[#7cb87c]">0.3</div>
              <div className="text-[10px] tracking-widest text-[#666] mt-2">SECONDS LATENCY</div>
            </div>
            <div>
              <div className="text-[15vw] lg:text-[8vw] font-black leading-none">∞</div>
              <div className="text-[10px] tracking-widest text-[#666] mt-2">TEAM MEMBERS</div>
            </div>
            <div>
              <div className="text-[15vw] lg:text-[8vw] font-black leading-none">0</div>
              <div className="text-[10px] tracking-widest text-[#666] mt-2">PER-SEAT FEES</div>
            </div>
            <div>
              <div className="text-[15vw] lg:text-[8vw] font-black leading-none text-[#7cb87c]">1</div>
              <div className="text-[10px] tracking-widest text-[#666] mt-2">CLICK TO COMMENT</div>
            </div>
          </div>
        </div>
      </section>

      {/* The math - scale contrast */}
      <section className="px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] tracking-widest text-[#666] mb-8">COST COMPARISON (5 EDITORS / YEAR)</div>

          <div className="flex items-end gap-8 mb-8">
            <div>
              <div className="text-[20vw] font-black leading-none line-through text-[#222] decoration-[#444]">
                1140
              </div>
              <div className="text-[10px] tracking-widest text-[#666] mt-2">FRAME.IO ($)</div>
            </div>
          </div>

          <div className="flex items-end gap-8">
            <div>
              <div className="text-[20vw] font-black leading-none text-[#7cb87c]">
                60
              </div>
              <div className="text-[10px] tracking-widest text-[#666] mt-2">LAWN ($)</div>
            </div>
            <div className="pb-[3vw]">
              <div className="text-xs text-[#666]">save</div>
              <div className="text-2xl font-black">$1,080</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - minimal */}
      <section className="px-6 py-32 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] tracking-widest text-[#666] mb-16">HOW IT WORKS</div>

          <div className="space-y-12">
            {[
              { num: "1", text: "UPLOAD" },
              { num: "2", text: "SHARE" },
              { num: "3", text: "CLICK" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-8">
                <span className="text-[15vw] font-black text-[#1a1a1a] leading-none">{step.num}</span>
                <span className="text-4xl font-black">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] tracking-widest text-[#666] mb-4">READY?</div>
          <div className="text-[25vw] font-black leading-none -ml-[1vw]">
            <span className="text-[#7cb87c]">GO</span>
          </div>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-block bg-[#eee] text-[#111] px-8 py-4 font-black hover:bg-[#7cb87c] transition-colors"
            >
              START FREE TRIAL →
            </Link>
            <p className="text-xs text-[#666] mt-4">$5/month • unlimited seats</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-[10px] tracking-widest text-[#666]">
          <span>© 2025 LAWN</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:text-[#eee]">GITHUB</Link>
            <Link href="/docs" className="hover:text-[#eee]">DOCS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
