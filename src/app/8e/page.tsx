"use client";

import Link from "next/link";

// Design 8e: Overlapping Layers
// Aggressive z-index, text cutting through text, depth

export default function Homepage8e() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee] overflow-x-hidden">
      {/* Nav - minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center mix-blend-difference">
        <span className="text-2xl font-black tracking-tighter">lawn</span>
        <div className="flex gap-4 text-sm">
          <Link href="/sign-in" className="hover:opacity-60">login</Link>
          <Link href="/sign-up" className="font-bold">sign up →</Link>
        </div>
      </nav>

      {/* Hero - overlapping chaos */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        {/* Background layer - huge faded text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="text-[40vw] font-black text-[#161616] leading-none">
            $5
          </span>
        </div>

        {/* Middle layer - the strike */}
        <div className="absolute top-[20%] left-[5%] transform -rotate-12 pointer-events-none">
          <div className="text-[15vw] font-black text-[#1a1a1a] line-through decoration-[#7cb87c] decoration-[12px]">
            $228
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-5xl">
          <h1 className="text-[18vw] sm:text-[14vw] font-black leading-[0.75] tracking-tighter">
            <span className="block">TOO</span>
            <span className="block -mt-[0.1em] ml-[20%]">
              <span className="text-[#7cb87c]">EX</span>PEN
            </span>
            <span className="block -mt-[0.1em]">SIVE</span>
          </h1>

          {/* Overlaid price card */}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 bg-[#7cb87c] text-[#111] p-6 transform rotate-3 shadow-2xl">
            <div className="text-xs font-bold tracking-wider">LAWN</div>
            <div className="text-5xl font-black">$5</div>
            <div className="text-xs mt-1">/month</div>
            <div className="text-[10px] mt-2 opacity-70">unlimited seats</div>
          </div>
        </div>

        {/* Foreground text cutting through */}
        <div className="absolute bottom-[15%] left-[10%] z-20">
          <p className="text-lg max-w-xs">
            <span className="bg-[#111] px-1">Frame.io charges per editor.</span>
            <br />
            <span className="bg-[#7cb87c] text-[#111] px-1 font-bold">We don't.</span>
          </p>
        </div>

        {/* CTA floating */}
        <div className="absolute bottom-[10%] right-[10%] z-20">
          <Link
            href="/sign-up"
            className="block bg-[#eee] text-[#111] px-8 py-4 font-black text-lg hover:bg-[#7cb87c] transition-colors transform -rotate-2"
          >
            TRY FREE
          </Link>
        </div>
      </section>

      {/* Features - stacked cards with overlap */}
      <section className="relative z-10 px-6 py-32 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {[
              { text: "FRAME ACCURATE", sub: "click exact frames", top: "0", left: "0", rotate: "-3deg", z: 1 },
              { text: "UNLIMITED SEATS", sub: "$5 total", top: "80px", left: "15%", rotate: "2deg", z: 2 },
              { text: "0.3s LATENCY", sub: "actually fast", top: "160px", left: "5%", rotate: "-1deg", z: 3 },
              { text: "NO LOCK-IN", sub: "any NLE works", top: "240px", left: "20%", rotate: "1deg", z: 4 },
            ].map((card, i) => (
              <div
                key={i}
                className="absolute bg-[#111] border-2 border-[#eee] p-6 w-[280px] hover:z-50 hover:bg-[#eee] hover:text-[#111] transition-colors cursor-default"
                style={{
                  top: card.top,
                  left: card.left,
                  transform: `rotate(${card.rotate})`,
                  zIndex: card.z,
                }}
              >
                <div className="text-xl font-black">{card.text}</div>
                <div className="text-sm text-[#666] mt-1">{card.sub}</div>
              </div>
            ))}
            {/* Spacer for card stack */}
            <div className="h-[400px]" />
          </div>
        </div>
      </section>

      {/* Math - overlapping numbers */}
      <section className="relative px-6 py-32 overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          {/* Big background numbers */}
          <div className="absolute -top-20 -left-10 text-[20vw] font-black text-[#161616] leading-none pointer-events-none">
            1080
          </div>

          <div className="relative z-10">
            <h2 className="text-sm tracking-widest text-[#666] mb-8">ANNUAL SAVINGS</h2>

            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <span className="text-[#666] w-32">frame.io</span>
                <span className="text-4xl font-black line-through text-[#333]">$1,140</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-[#666] w-32">lawn</span>
                <span className="text-4xl font-black text-[#7cb87c]">$60</span>
              </div>
              <div className="flex items-baseline gap-4 pt-6 border-t border-[#333]">
                <span className="text-[#666] w-32">yours</span>
                <span className="text-6xl font-black">$1,080</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - text breaking out */}
      <section className="relative px-6 py-32 bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-[20vw] font-black leading-none text-[#161616] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            GO
          </h2>
          <div className="relative z-10">
            <p className="text-2xl mb-8">ready to switch?</p>
            <Link
              href="/sign-up"
              className="inline-block bg-[#7cb87c] text-[#111] px-12 py-5 text-xl font-black hover:bg-[#a0d0a0] transition-colors"
            >
              START FREE TRIAL
            </Link>
            <p className="mt-6 text-sm text-[#666]">$5/mo • unlimited • no bs</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] px-6 py-8">
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
