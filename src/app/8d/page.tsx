"use client";

import Link from "next/link";

// Design 8d: Deconstructed - Vertical Scroll Story
// Long scroll, elements reveal as you go, more editorial but still raw

export default function Homepage8d() {
  return (
    <div className="min-h-screen bg-[#111] text-[#eee]">
      {/* Fixed nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#111]/90 backdrop-blur border-b border-[#222]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-xl font-black tracking-tighter">lawn</span>
          <div className="flex gap-4 text-sm">
            <Link href="/sign-in" className="hover:text-[#7cb87c]">login</Link>
            <Link
              href="/sign-up"
              className="bg-[#eee] text-[#111] px-4 py-2 font-bold hover:bg-[#7cb87c] transition-colors"
            >
              sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Section 1: The Hook */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="text-center">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tight">
            <span className="block transform -rotate-2">WHAT IF</span>
            <span className="block text-[#444] transform rotate-1">VIDEO REVIEW</span>
            <span className="block transform -rotate-1">WASN'T</span>
            <span className="block text-[#7cb87c] transform rotate-2">PAINFUL?</span>
          </h1>
        </div>
      </section>

      {/* Section 2: The Problem */}
      <section className="min-h-screen flex items-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-[#666] mb-8 tracking-widest transform -rotate-1">
            THE CURRENT SITUATION
          </div>
          <h2 className="text-4xl sm:text-6xl font-black leading-tight mb-8">
            Frame.io charges
            <br />
            <span className="text-[#7cb87c]">$228/year</span>
            <br />
            <span className="text-[#666]">per editor.</span>
          </h2>
          <p className="text-xl text-[#888] max-w-xl transform rotate-1">
            That's $1,140/year for a team of 5.
            <br />
            And it's not even that fast.
          </p>
        </div>
      </section>

      {/* Section 3: The Insight */}
      <section className="min-h-screen flex items-center px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-[#666] mb-8 tracking-widest transform rotate-1">
            THE REALIZATION
          </div>
          <blockquote className="text-4xl sm:text-5xl font-black leading-tight transform -rotate-1">
            "I spent more time waiting for Frame.io to load than actually reviewing videos."
          </blockquote>
          <p className="text-lg text-[#666] mt-8 transform rotate-1">
            — A YouTuber who decided to build something better
          </p>
        </div>
      </section>

      {/* Section 4: The Solution */}
      <section className="min-h-screen flex items-center px-6">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-sm text-[#7cb87c] mb-8 tracking-widest">
            THE ALTERNATIVE
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl sm:text-7xl font-black leading-[0.9] mb-8 transform -rotate-1">
                LAWN
                <br />
                <span className="text-[#444]">IS</span>
                <br />
                DIFFERENT
              </h2>
            </div>

            <div className="space-y-6">
              {[
                { label: "PRICE", value: "$5/month", sub: "flat, forever" },
                { label: "SEATS", value: "Unlimited", sub: "add everyone" },
                { label: "SPEED", value: "0.3s", sub: "average response" },
                { label: "LOCK-IN", value: "None", sub: "use any NLE" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-end border-b border-[#333] pb-4"
                  style={{ transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}
                >
                  <div>
                    <div className="text-xs text-[#666] mb-1">{item.label}</div>
                    <div className="text-3xl font-black">{item.value}</div>
                  </div>
                  <div className="text-sm text-[#666]">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: The Math */}
      <section className="min-h-screen flex items-center px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-[#666] mb-12 tracking-widest">
            THE SAVINGS (5 EDITORS, 1 YEAR)
          </div>

          <div className="space-y-8">
            <div className="transform -rotate-1">
              <span className="text-2xl text-[#666]">frame.io: </span>
              <span className="text-6xl font-black line-through text-[#444]">$1,140</span>
            </div>

            <div className="transform rotate-1">
              <span className="text-2xl text-[#666]">lawn: </span>
              <span className="text-6xl font-black text-[#7cb87c]">$60</span>
            </div>

            <div className="pt-8 border-t border-[#333] transform -rotate-1">
              <span className="text-2xl text-[#666]">you keep: </span>
              <span className="text-7xl font-black text-[#eee]">$1,080</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: How It Works */}
      <section className="min-h-[50vh] flex items-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-[#666] mb-12 tracking-widest">
            HOW IT WORKS
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { num: "01", title: "UPLOAD", desc: "Drag your video in" },
              { num: "02", title: "SHARE", desc: "Send the link" },
              { num: "03", title: "CLICK", desc: "Comment on any frame" },
            ].map((step, i) => (
              <div
                key={i}
                className="group"
                style={{ transform: `rotate(${(i - 1) * 1.5}deg)` }}
              >
                <div className="text-6xl font-black text-[#222] group-hover:text-[#7cb87c] transition-colors">
                  {step.num}
                </div>
                <div className="text-2xl font-black mt-4">{step.title}</div>
                <div className="text-[#666] mt-2">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="min-h-screen flex items-center justify-center px-6 bg-[#0a0a0a]">
        <div className="text-center">
          <h2 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[0.85] mb-12">
            <span className="block transform -rotate-2">READY</span>
            <span className="block text-[#7cb87c] transform rotate-1">TO</span>
            <span className="block transform -rotate-1">SWITCH?</span>
          </h2>

          <Link
            href="/sign-up"
            className="inline-block bg-[#eee] text-[#111] px-16 py-8 text-2xl font-black hover:bg-[#7cb87c] transition-colors transform -rotate-1 hover:rotate-0"
          >
            START FREE TRIAL →
          </Link>

          <p className="mt-12 text-[#666]">
            $5/month after trial • unlimited seats • cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] px-6 py-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm text-[#666]">
          <span>© 2025 lawn</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:text-[#eee]">github</Link>
            <Link href="/docs" className="hover:text-[#eee]">docs</Link>
            <Link href="/privacy" className="hover:text-[#eee]">privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
