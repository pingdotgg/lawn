"use client";

import Link from "next/link";

// Design 8b: Deconstructed - Split Screen Tension
// Diagonal split, high contrast, things breaking across the divide

export default function Homepage8b() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee] overflow-hidden">
      {/* Diagonal divider - visual element */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "linear-gradient(135deg, #111 50%, #0a0a0a 50%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-20 p-6 flex justify-between items-center">
        <span className="text-2xl font-black tracking-tighter">lawn</span>
        <div className="flex gap-4 text-sm">
          <Link href="/sign-in" className="hover:text-[#7cb87c] underline underline-offset-4">
            login
          </Link>
          <Link
            href="/sign-up"
            className="border border-[#eee] px-4 py-2 font-bold hover:bg-[#eee] hover:text-[#111] transition-colors"
          >
            sign up
          </Link>
        </div>
      </nav>

      {/* Hero - split tension */}
      <section className="relative z-10 min-h-[80vh] flex items-center">
        <div className="w-full px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - the problem */}
            <div className="transform -rotate-1">
              <div className="text-sm text-[#666] mb-4 tracking-widest">THE PROBLEM</div>
              <h1 className="text-5xl sm:text-7xl font-black leading-[0.9] mb-6">
                FRAME.IO
                <br />
                <span className="text-[#444]">IS TOO</span>
                <br />
                EXPENSIVE
              </h1>
              <div className="flex items-center gap-4 mt-8">
                <div className="text-4xl font-black line-through text-[#666]">$228</div>
                <div className="text-sm text-[#666]">per editor / year</div>
              </div>
            </div>

            {/* Right side - the solution */}
            <div className="transform rotate-1">
              <div className="text-sm text-[#7cb87c] mb-4 tracking-widest">THE SOLUTION</div>
              <div className="bg-[#7cb87c] text-[#111] p-8 transform -rotate-2">
                <div className="text-6xl sm:text-8xl font-black">$5</div>
                <div className="text-xl font-bold mt-2">per month</div>
                <div className="text-sm mt-4 opacity-80">unlimited team members</div>
              </div>
              <Link
                href="/sign-up"
                className="inline-block mt-8 bg-[#eee] text-[#111] px-8 py-4 font-black hover:bg-[#7cb87c] transition-colors transform rotate-1"
              >
                SWITCH NOW →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker strip */}
      <section className="relative z-10 bg-[#eee] text-[#111] py-4 transform -rotate-1 scale-105 my-16">
        <div className="flex items-center justify-center gap-12 text-lg font-black whitespace-nowrap overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="flex items-center gap-12">
              <span>FRAME ACCURATE</span>
              <span className="text-[#7cb87c]">•</span>
              <span>UNLIMITED SEATS</span>
              <span className="text-[#7cb87c]">•</span>
              <span>0.3S LATENCY</span>
              <span className="text-[#7cb87c]">•</span>
            </span>
          ))}
        </div>
      </section>

      {/* Features - offset grid */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-8">
            {[
              { num: "01", title: "CLICK ANY FRAME", desc: "Comments land on the exact frame. No more timestamp confusion." },
              { num: "02", title: "ADD EVERYONE", desc: "One flat price. Invite your whole team, clients, everyone." },
              { num: "03", title: "ACTUALLY FAST", desc: "Built because Frame.io felt slow. 0.3 second average response." },
              { num: "04", title: "NO LOCK-IN", desc: "Works with Premiere, Resolve, Final Cut, whatever you use." },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-8 p-6 border border-[#333] hover:bg-[#1a1a1a] transition-colors"
                style={{ transform: `translateX(${i % 2 === 0 ? -20 : 20}px) rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}
              >
                <span className="text-5xl font-black text-[#222]">{item.num}</span>
                <div>
                  <h3 className="text-2xl font-black mb-2">{item.title}</h3>
                  <p className="text-[#888]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Savings callout */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block transform -rotate-2">
            <div className="text-sm text-[#666] mb-4">5 EDITORS × 1 YEAR</div>
            <div className="flex items-center gap-8">
              <div>
                <div className="text-5xl font-black line-through text-[#444]">$1,140</div>
                <div className="text-xs text-[#666] mt-1">frame.io</div>
              </div>
              <div className="text-4xl text-[#666]">→</div>
              <div>
                <div className="text-5xl font-black text-[#7cb87c]">$60</div>
                <div className="text-xs text-[#666] mt-1">lawn</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-6xl sm:text-8xl font-black mb-8 transform -rotate-1">
            READY?
          </h2>
          <Link
            href="/sign-up"
            className="inline-block bg-[#eee] text-[#111] px-16 py-6 text-2xl font-black hover:bg-[#7cb87c] transition-colors transform rotate-1 hover:rotate-0"
          >
            START FREE TRIAL
          </Link>
          <p className="mt-8 text-sm text-[#666]">$5/month after trial • cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#333] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-[#666]">
          <span>© 2025 lawn</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:text-[#eee]">github</Link>
            <Link href="/docs" className="hover:text-[#eee]">docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
