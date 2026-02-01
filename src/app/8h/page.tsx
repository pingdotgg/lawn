"use client";

import Link from "next/link";

// Design 8h: Ransom Note / Cut-up
// Mixed materials, boxed words, inverted sections, collage feel

export default function Homepage8h() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee] overflow-x-hidden">
      {/* Nav */}
      <nav className="relative z-20 p-6 flex justify-between items-center">
        <span className="bg-[#eee] text-[#111] px-3 py-1 font-black text-xl">lawn</span>
        <div className="flex gap-3 text-sm">
          <Link href="/sign-in" className="border border-[#444] px-3 py-1 hover:border-[#eee]">
            login
          </Link>
          <Link href="/sign-up" className="bg-[#7cb87c] text-[#111] px-3 py-1 font-bold">
            sign up
          </Link>
        </div>
      </nav>

      {/* Hero - ransom note style */}
      <section className="relative z-10 px-6 py-16 min-h-[80vh] flex items-center">
        <div className="max-w-5xl mx-auto">
          {/* Headline as cut-up pieces */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-tight">
            <span className="inline-block bg-[#eee] text-[#111] px-3 py-1 transform -rotate-1">FRAME.IO</span>
            {" "}
            <span className="inline-block text-[#666]">is</span>
            {" "}
            <span className="inline-block border-2 border-[#eee] px-3 py-1 transform rotate-1">getting</span>
            <br />
            <span className="inline-block bg-[#7cb87c] text-[#111] px-4 py-2 transform -rotate-2 mt-2 text-5xl sm:text-7xl lg:text-8xl">
              EXPENSIVE
            </span>
          </h1>

          {/* Price tags as cut pieces */}
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <div className="bg-[#1a1a1a] px-4 py-3 transform rotate-2">
              <div className="text-xs text-[#666]">FRAME.IO</div>
              <div className="text-2xl font-black line-through text-[#666]">$228/yr</div>
              <div className="text-xs text-[#666]">per editor</div>
            </div>

            <span className="text-4xl text-[#333]">→</span>

            <div className="bg-[#eee] text-[#111] px-4 py-3 transform -rotate-1">
              <div className="text-xs font-bold">LAWN</div>
              <div className="text-3xl font-black">$5/mo</div>
              <div className="text-xs">unlimited</div>
            </div>
          </div>

          {/* CTA as cut piece */}
          <div className="mt-12">
            <Link
              href="/sign-up"
              className="inline-block bg-[#111] border-4 border-[#eee] px-8 py-4 font-black text-xl hover:bg-[#eee] hover:text-[#111] transition-colors transform rotate-1"
            >
              TRY IT FREE →
            </Link>
          </div>
        </div>
      </section>

      {/* Features as scattered cut pieces */}
      <section className="relative z-10 px-6 py-24 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-4">
            {[
              { text: "FRAME ACCURATE", style: "bg-[#eee] text-[#111]", rotate: "-2deg" },
              { text: "UNLIMITED SEATS", style: "border-2 border-[#eee]", rotate: "1deg" },
              { text: "0.3s LATENCY", style: "bg-[#7cb87c] text-[#111]", rotate: "-1deg" },
              { text: "NO ADOBE", style: "border-2 border-[#7cb87c] text-[#7cb87c]", rotate: "2deg" },
              { text: "ANY NLE", style: "bg-[#eee] text-[#111]", rotate: "-1deg" },
              { text: "SHARE LINKS", style: "border-2 border-[#eee]", rotate: "1deg" },
            ].map((tag, i) => (
              <span
                key={i}
                className={`inline-block px-4 py-2 font-black ${tag.style}`}
                style={{ transform: `rotate(${tag.rotate})` }}
              >
                {tag.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The math - as a "clipping" */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#eee] text-[#111] p-8 transform -rotate-1">
            <div className="text-xs font-bold tracking-widest mb-6">/// ANNUAL COST COMPARISON</div>

            <div className="space-y-4 font-mono">
              <div className="flex justify-between items-center border-b border-[#ccc] pb-2">
                <span>FRAME.IO (5 editors)</span>
                <span className="font-black line-through">$1,140</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#111] pb-2">
                <span>LAWN (unlimited)</span>
                <span className="font-black">$60</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-black">YOU KEEP</span>
                <span className="text-3xl font-black">$1,080</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - cut pieces */}
      <section className="relative z-10 px-6 py-24 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 text-4xl sm:text-5xl font-black">
            <span className="bg-[#1a1a1a] px-4 py-2 text-[#666]">1.</span>
            <span className="bg-[#eee] text-[#111] px-4 py-2 transform -rotate-1">UPLOAD</span>
            <span className="bg-[#1a1a1a] px-4 py-2 text-[#666]">2.</span>
            <span className="border-2 border-[#eee] px-4 py-2 transform rotate-1">SHARE</span>
            <span className="bg-[#1a1a1a] px-4 py-2 text-[#666]">3.</span>
            <span className="bg-[#7cb87c] text-[#111] px-4 py-2 transform -rotate-2">CLICK</span>
          </div>
        </div>
      </section>

      {/* Final CTA - inverted */}
      <section className="relative z-10 bg-[#eee] text-[#111] px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl sm:text-7xl font-black mb-8">
            <span className="inline-block bg-[#111] text-[#eee] px-4 py-2 transform -rotate-2">STOP</span>
            {" "}
            <span className="inline-block bg-[#7cb87c] px-4 py-2 transform rotate-1">OVERPAYING</span>
          </h2>

          <Link
            href="/sign-up"
            className="inline-block bg-[#111] text-[#eee] px-12 py-5 text-xl font-black hover:bg-[#7cb87c] hover:text-[#111] transition-colors transform -rotate-1"
          >
            START FREE TRIAL
          </Link>

          <p className="mt-8 text-sm">
            <span className="bg-[#111] text-[#eee] px-2 py-1">$5/month</span>
            {" • "}
            <span className="border border-[#111] px-2 py-1">unlimited seats</span>
            {" • "}
            <span className="bg-[#7cb87c] px-2 py-1">no tricks</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#333] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-[#666]">
          <span className="bg-[#1a1a1a] px-2 py-1">© 2025</span>
          <div className="flex gap-4">
            <Link href="/github" className="border border-[#333] px-2 py-1 hover:border-[#eee]">github</Link>
            <Link href="/docs" className="border border-[#333] px-2 py-1 hover:border-[#eee]">docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
