"use client";

import Link from "next/link";

// Design 8g: Dramatic Negative Space
// Asymmetric, bold use of emptiness, content pushed to edges

export default function Homepage8g() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee]">
      {/* Nav - pushed to corner */}
      <nav className="fixed top-0 right-0 z-50 p-6 text-right">
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/sign-in" className="hover:text-[#7cb87c]">login</Link>
          <Link href="/sign-up" className="text-[#7cb87c] font-bold">sign up</Link>
        </div>
      </nav>

      {/* Logo - opposite corner */}
      <div className="fixed top-6 left-6 z-50">
        <span className="text-2xl font-black tracking-tighter">lawn</span>
      </div>

      {/* Hero - content on left edge, massive empty space */}
      <section className="min-h-screen flex items-center">
        <div className="w-full max-w-[500px] pl-6 pr-12">
          <h1 className="text-6xl sm:text-7xl font-black leading-[0.85] tracking-tight">
            FRAME.IO
            <br />
            <span className="text-[#444]">IS</span>
            <br />
            EXPENSIVE
          </h1>

          <div className="mt-12 space-y-6">
            <div className="flex items-baseline justify-between border-b border-[#333] pb-2">
              <span className="text-sm text-[#666]">them</span>
              <span className="text-2xl font-black line-through text-[#444]">$228/yr</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-[#7cb87c] pb-2">
              <span className="text-sm text-[#7cb87c]">us</span>
              <span className="text-2xl font-black text-[#7cb87c]">$5/mo</span>
            </div>
          </div>

          <p className="mt-8 text-sm text-[#666] max-w-xs">
            Unlimited seats. Frame-accurate comments. Built by a creator who got tired of waiting.
          </p>

          <Link
            href="/sign-up"
            className="inline-block mt-8 bg-[#eee] text-[#111] px-8 py-4 font-black hover:bg-[#7cb87c] transition-colors"
          >
            TRY FREE →
          </Link>
        </div>

        {/* Right side - just a single floating element in the void */}
        <div className="hidden lg:block absolute right-[10%] top-1/2 -translate-y-1/2">
          <div className="text-[20vw] font-black text-[#161616] leading-none">
            $5
          </div>
        </div>
      </section>

      {/* Features - right aligned, lots of left space */}
      <section className="min-h-screen flex items-center justify-end bg-[#0a0a0a]">
        <div className="w-full max-w-[500px] pr-6 pl-12">
          <div className="text-xs tracking-widest text-[#666] mb-12">FEATURES</div>

          <div className="space-y-8">
            {[
              { title: "FRAME ACCURATE", desc: "Comments on exact frames" },
              { title: "UNLIMITED SEATS", desc: "Add your whole team" },
              { title: "0.3s LATENCY", desc: "Actually responsive" },
              { title: "NO LOCK-IN", desc: "Works with any editor" },
            ].map((feature, i) => (
              <div key={i} className="border-l-2 border-[#333] pl-4 hover:border-[#7cb87c] transition-colors">
                <div className="font-black">{feature.title}</div>
                <div className="text-sm text-[#666]">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Left side void element */}
        <div className="hidden lg:block absolute left-[5%] top-1/2 -translate-y-1/2">
          <div className="text-9xl font-black text-[#141414]">✓</div>
        </div>
      </section>

      {/* Math - centered for contrast, surrounded by space */}
      <section className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-xs tracking-widest text-[#666] mb-8">5 EDITORS × 1 YEAR</div>

          <div className="flex items-center justify-center gap-12">
            <div className="text-right">
              <div className="text-5xl font-black line-through text-[#333]">$1,140</div>
              <div className="text-xs text-[#666] mt-1">frame.io</div>
            </div>

            <div className="text-4xl text-[#333]">→</div>

            <div className="text-left">
              <div className="text-5xl font-black text-[#7cb87c]">$60</div>
              <div className="text-xs text-[#666] mt-1">lawn</div>
            </div>
          </div>

          <div className="mt-12 inline-block bg-[#7cb87c] text-[#111] px-6 py-2 font-black">
            SAVE $1,080
          </div>
        </div>
      </section>

      {/* CTA - back to left edge */}
      <section className="min-h-[60vh] flex items-center bg-[#0a0a0a]">
        <div className="w-full max-w-[500px] pl-6 pr-12">
          <h2 className="text-5xl font-black leading-tight">
            STOP
            <br />
            <span className="text-[#7cb87c]">OVERPAYING</span>
          </h2>

          <Link
            href="/sign-up"
            className="inline-block mt-8 bg-[#eee] text-[#111] px-10 py-5 text-lg font-black hover:bg-[#7cb87c] transition-colors"
          >
            START FREE TRIAL
          </Link>

          <p className="mt-4 text-xs text-[#666]">$5/mo • unlimited seats • cancel anytime</p>
        </div>
      </section>

      {/* Footer - minimal, edge aligned */}
      <footer className="px-6 py-8">
        <div className="flex justify-between items-center text-xs text-[#666]">
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
