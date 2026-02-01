"use client";

import Link from "next/link";

// Design 6: Brutalist Manifesto
// Raw, stark, black/white with green accent only on key elements
// Direct confrontation of Frame.io

export default function Homepage6() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-mono">
      {/* Top banner - the callout */}
      <div className="border-b-2 border-[#e5e5e5] py-3 px-4 text-center text-sm">
        <span className="opacity-60">YOU ARE CURRENTLY PAYING</span>{" "}
        <span className="text-[#7cb87c] font-bold">$228/YEAR</span>{" "}
        <span className="opacity-60">FOR FRAME.IO</span>
      </div>

      {/* Navigation - raw */}
      <nav className="border-b border-[#333] px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold tracking-tight">LAWN</span>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/docs" className="hover:text-[#7cb87c] transition-colors">
            DOCS
          </Link>
          <Link href="/sign-in" className="hover:text-[#7cb87c] transition-colors">
            LOGIN
          </Link>
          <Link
            href="/sign-up"
            className="border border-[#e5e5e5] px-4 py-2 hover:bg-[#e5e5e5] hover:text-[#0a0a0a] transition-colors"
          >
            SIGN UP
          </Link>
        </div>
      </nav>

      {/* Hero - massive statement */}
      <section className="px-6 py-24 border-b border-[#333]">
        <div className="max-w-6xl mx-auto">
          {/* The big statement */}
          <h1 className="text-[12vw] sm:text-[10vw] font-black leading-[0.85] tracking-[-0.03em] mb-12">
            FRAME.IO
            <br />
            <span className="text-[#333] relative">
              IS TOO
              <span className="absolute top-1/2 left-0 right-0 h-1 bg-[#7cb87c]" />
            </span>
            <br />
            EXPENSIVE
          </h1>

          {/* Substatement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
            <div>
              <p className="text-2xl leading-relaxed">
                You don't need to pay{" "}
                <span className="line-through opacity-50">$19/editor/month</span>{" "}
                for video review. You need something that works.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="border border-[#333] p-6">
                <div className="text-5xl font-black text-[#7cb87c]">$5</div>
                <div className="text-sm opacity-60 mt-1">PER MONTH / UNLIMITED SEATS</div>
              </div>
              <Link
                href="/sign-up"
                className="bg-[#e5e5e5] text-[#0a0a0a] p-6 text-center font-bold hover:bg-[#7cb87c] transition-colors"
              >
                SWITCH TO LAWN →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Raw feature list */}
      <section className="px-6 py-16 border-b border-[#333]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#333]">
            {[
              { label: "FRAME ACCURATE", value: "YES" },
              { label: "PER-SEAT PRICING", value: "NO" },
              { label: "AVERAGE LATENCY", value: "0.3S" },
              { label: "ADOBE REQUIRED", value: "NO" },
            ].map((item, i) => (
              <div key={i} className="bg-[#0a0a0a] p-8">
                <div className="text-xs opacity-50 mb-2">{item.label}</div>
                <div className="text-3xl font-black">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison - brutal honesty */}
      <section className="px-6 py-16 border-b border-[#333]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black mb-12">THE MATH</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-lg sm:text-2xl">
              <span className="opacity-50 w-32">FRAME.IO</span>
              <span className="flex-1 border-b border-dashed border-[#333]" />
              <span className="font-bold">$228/YEAR</span>
              <span className="text-sm opacity-50">×5 EDITORS =</span>
              <span className="font-black text-red-400">$1,140</span>
            </div>
            <div className="flex items-center gap-4 text-lg sm:text-2xl">
              <span className="opacity-50 w-32">LAWN</span>
              <span className="flex-1 border-b border-dashed border-[#333]" />
              <span className="font-bold">$60/YEAR</span>
              <span className="text-sm opacity-50">×∞ EDITORS =</span>
              <span className="font-black text-[#7cb87c]">$60</span>
            </div>
          </div>

          <div className="mt-12 p-8 border-2 border-[#7cb87c]">
            <div className="text-sm opacity-60 mb-2">YOUR ANNUAL SAVINGS</div>
            <div className="text-6xl font-black text-[#7cb87c]">$1,080</div>
          </div>
        </div>
      </section>

      {/* How it works - minimal */}
      <section className="px-6 py-16 border-b border-[#333]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black mb-12">HOW IT WORKS</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: "01", text: "UPLOAD YOUR VIDEO" },
              { num: "02", text: "SHARE THE LINK" },
              { num: "03", text: "CLICK TO COMMENT ON ANY FRAME" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-6xl font-black text-[#222]">{step.num}</span>
                <span className="text-xl font-bold pt-4">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-5xl sm:text-7xl font-black mb-8">
            STOP OVERPAYING
          </h2>
          <Link
            href="/sign-up"
            className="inline-block bg-[#7cb87c] text-[#0a0a0a] px-12 py-6 text-xl font-black hover:bg-[#a0d0a0] transition-colors"
          >
            START YOUR TRIAL
          </Link>
          <p className="mt-6 text-sm opacity-50">$5/MONTH • UNLIMITED TEAM MEMBERS</p>
        </div>
      </section>

      {/* Footer - minimal */}
      <footer className="border-t border-[#333] px-6 py-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm opacity-50">
          <span>© 2025 LAWN</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:opacity-100">GITHUB</Link>
            <Link href="/privacy" className="hover:opacity-100">PRIVACY</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
