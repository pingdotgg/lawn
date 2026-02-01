"use client";

import Link from "next/link";

// Design 10: Protest Poster / Propaganda
// Bold political poster aesthetic, direct messaging
// Heavy type, stark contrast, green only for emphasis

export default function Homepage10() {
  return (
    <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a] overflow-hidden">
      {/* Distressed texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top strip */}
      <div className="bg-[#1a1a1a] text-[#f0f0e8] py-1 px-4 flex justify-between items-center text-xs">
        <span>VIDEO REVIEW FOR THE PEOPLE</span>
        <div className="flex gap-4">
          <Link href="/sign-in" className="hover:underline">Sign In</Link>
          <Link href="/sign-up" className="font-bold hover:underline">Join Now</Link>
        </div>
      </div>

      {/* Main poster content */}
      <main className="relative z-10">
        {/* Hero - The main message */}
        <section className="px-6 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            {/* Pre-headline */}
            <div className="text-center mb-8">
              <span className="inline-block bg-[#1a1a1a] text-[#f0f0e8] px-4 py-2 text-sm tracking-widest">
                ATTENTION CREATORS
              </span>
            </div>

            {/* Main headline - propaganda style */}
            <h1 className="text-center">
              <span className="block text-[12vw] sm:text-[10vw] font-black leading-[0.85] tracking-tight">
                FRAME.IO
              </span>
              <span className="block text-[8vw] sm:text-[7vw] font-black leading-[0.85] tracking-tight text-[#1a1a1a]/30">
                CHARGES YOU
              </span>
              <span className="block text-[15vw] sm:text-[12vw] font-black leading-[0.85] tracking-tight">
                $228<span className="text-[5vw] align-top">/YR</span>
              </span>
              <span className="block text-[6vw] sm:text-[5vw] font-black leading-[0.85] tracking-tight text-[#1a1a1a]/30 mt-4">
                PER EDITOR
              </span>
            </h1>

            {/* The alternative - highlighted */}
            <div className="mt-16 text-center">
              <div className="inline-block bg-[#2d5a2d] text-[#f0f0e8] px-8 py-6 transform -rotate-1">
                <div className="text-sm tracking-widest mb-2">THE ALTERNATIVE</div>
                <div className="text-6xl sm:text-8xl font-black">
                  $5<span className="text-2xl">/MO</span>
                </div>
                <div className="text-lg mt-2">UNLIMITED SEATS</div>
              </div>
            </div>
          </div>
        </section>

        {/* The accusation strip */}
        <section className="bg-[#1a1a1a] text-[#f0f0e8] py-8 -rotate-1 scale-105">
          <div className="flex items-center justify-center gap-8 text-2xl sm:text-4xl font-black tracking-tight whitespace-nowrap animate-marquee">
            <span>PER-SEAT PRICING IS A TAX ON COLLABORATION</span>
            <span className="text-[#7cb87c]">★</span>
            <span>PER-SEAT PRICING IS A TAX ON COLLABORATION</span>
            <span className="text-[#7cb87c]">★</span>
            <span>PER-SEAT PRICING IS A TAX ON COLLABORATION</span>
            <span className="text-[#7cb87c]">★</span>
          </div>
        </section>

        {/* The demands */}
        <section className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl sm:text-6xl font-black text-center mb-16">
              LAWN DEMANDS
            </h2>

            <div className="space-y-4">
              {[
                { num: "I", text: "FRAME-ACCURATE COMMENTS", sub: "CLICK THE EXACT FRAME. NO TIMESTAMPS." },
                { num: "II", text: "NO PER-SEAT PRICING", sub: "ONE PRICE. UNLIMITED TEAM MEMBERS." },
                { num: "III", text: "SPEED WITHOUT COMPROMISE", sub: "0.3 SECOND AVERAGE RESPONSE TIME." },
                { num: "IV", text: "FREEDOM FROM ADOBE", sub: "WORKS WITH ANY EDITING SOFTWARE." },
              ].map((demand, i) => (
                <div
                  key={i}
                  className="flex items-start gap-6 p-6 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f0f0e8] transition-colors group"
                >
                  <span className="text-4xl font-black text-[#1a1a1a]/20 group-hover:text-[#7cb87c] transition-colors">
                    {demand.num}
                  </span>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black">{demand.text}</div>
                    <div className="text-sm mt-1 opacity-60">{demand.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The math - stark */}
        <section className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-black mb-12">THE MATHEMATICS OF EXPLOITATION</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
              <div className="border border-[#333] p-6">
                <div className="text-sm opacity-60 mb-2">FRAME.IO (5 EDITORS)</div>
                <div className="text-4xl font-black line-through opacity-50">$1,140</div>
                <div className="text-sm opacity-60 mt-1">PER YEAR</div>
              </div>
              <div className="border border-[#7cb87c] p-6 bg-[#7cb87c]/10">
                <div className="text-sm text-[#7cb87c] mb-2">LAWN (∞ EDITORS)</div>
                <div className="text-4xl font-black text-[#7cb87c]">$60</div>
                <div className="text-sm opacity-60 mt-1">PER YEAR</div>
              </div>
              <div className="border border-[#333] p-6">
                <div className="text-sm opacity-60 mb-2">YOUR SAVINGS</div>
                <div className="text-4xl font-black">$1,080</div>
                <div className="text-sm opacity-60 mt-1">ANNUALLY</div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to action - rally cry */}
        <section className="px-6 py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-6xl sm:text-8xl font-black mb-8">
              JOIN THE
              <br />
              <span className="text-[#2d5a2d]">REVOLUTION</span>
            </h2>

            <p className="text-xl mb-12 max-w-xl mx-auto">
              Thousands of creators have already switched.
              Stop subsidizing Adobe's shareholders.
            </p>

            <Link
              href="/sign-up"
              className="inline-block bg-[#1a1a1a] text-[#f0f0e8] px-16 py-6 text-2xl font-black hover:bg-[#2d5a2d] transition-colors"
            >
              START YOUR TRIAL
            </Link>

            <p className="mt-6 text-sm opacity-60">
              $5/MONTH • UNLIMITED SEATS • CANCEL ANYTIME
            </p>
          </div>
        </section>

        {/* Bottom stamp */}
        <section className="px-6 pb-12">
          <div className="max-w-5xl mx-auto flex justify-center">
            <div className="border-4 border-[#1a1a1a] px-8 py-4 transform rotate-3">
              <div className="text-xs tracking-widest text-center">CERTIFIED</div>
              <div className="text-3xl font-black text-center">ADOBE-FREE</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <span className="font-black text-xl">LAWN</span>
          <div className="flex gap-6 opacity-60">
            <Link href="/github" className="hover:opacity-100">GitHub</Link>
            <Link href="/docs" className="hover:opacity-100">Docs</Link>
            <Link href="/privacy" className="hover:opacity-100">Privacy</Link>
          </div>
          <span className="opacity-60">© 2025</span>
        </div>
      </footer>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
