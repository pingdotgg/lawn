"use client";

import { useState } from "react";
import Link from "next/link";

// Design 8c: Deconstructed - Interactive Chaos
// Elements that react to hover, more playful but still raw

export default function Homepage8c() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#111] text-[#eee] overflow-x-hidden">
      {/* Nav */}
      <nav className="relative z-20 p-6 flex justify-between items-center">
        <div className="group">
          <span className="text-2xl font-black tracking-tighter inline-block group-hover:rotate-[-4deg] transition-transform">
            lawn
          </span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/sign-in" className="hover:text-[#7cb87c] underline underline-offset-4">
            login
          </Link>
          <Link
            href="/sign-up"
            className="bg-[#eee] text-[#111] px-4 py-2 font-bold hover:bg-[#7cb87c] hover:rotate-1 transition-all"
          >
            sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 py-16 min-h-[70vh] flex items-center">
        <div className="max-w-5xl mx-auto">
          {/* Headline with interactive words */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight">
            <span className="inline-block hover:rotate-[-2deg] hover:text-[#7cb87c] transition-all cursor-default">
              VIDEO
            </span>{" "}
            <span className="inline-block hover:rotate-[2deg] hover:scale-110 transition-all cursor-default">
              REVIEW
            </span>
            <br />
            <span className="text-[#444] inline-block hover:text-[#666] transition-colors cursor-default">
              SHOULDN'T
            </span>{" "}
            <span className="text-[#444] inline-block hover:text-[#666] transition-colors cursor-default">
              BE
            </span>
            <br />
            <span className="inline-block hover:rotate-[-1deg] hover:text-[#7cb87c] transition-all cursor-default">
              THIS
            </span>{" "}
            <span className="inline-block hover:rotate-[3deg] hover:scale-105 transition-all cursor-default">
              EXPENSIVE
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-12 text-xl text-[#888] max-w-lg">
            Frame.io charges <span className="line-through">$228/year per editor</span>.
            <br />
            We charge <span className="text-[#7cb87c] font-bold">$5/month for everyone</span>.
          </p>

          {/* CTA buttons - tilted */}
          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href="/sign-up"
              className="bg-[#7cb87c] text-[#111] px-8 py-4 font-black text-lg hover:rotate-[-2deg] hover:scale-105 transition-all"
            >
              TRY IT FREE
            </Link>
            <Link
              href="/docs"
              className="border-2 border-[#333] px-8 py-4 font-bold text-lg hover:border-[#eee] hover:rotate-[1deg] transition-all"
            >
              LEARN MORE
            </Link>
          </div>
        </div>
      </section>

      {/* Features - interactive grid */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "FRAME ACCURATE",
                desc: "Comments on exact frames",
                emoji: "🎯",
              },
              {
                title: "UNLIMITED SEATS",
                desc: "$5 for your whole team",
                emoji: "👥",
              },
              {
                title: "STUPID FAST",
                desc: "0.3s average latency",
                emoji: "⚡",
              },
              {
                title: "NO ADOBE TAX",
                desc: "Use whatever NLE you want",
                emoji: "🔓",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`border-2 p-8 transition-all cursor-default ${
                  hoveredFeature === i
                    ? "bg-[#eee] text-[#111] border-[#eee] rotate-[-1deg] scale-[1.02]"
                    : "border-[#333] hover:border-[#666]"
                }`}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{
                  transform: hoveredFeature === i ? `rotate(${i % 2 === 0 ? -2 : 2}deg)` : "none",
                }}
              >
                <div className="text-4xl mb-4">{feature.emoji}</div>
                <h3 className="text-2xl font-black mb-2">{feature.title}</h3>
                <p className={hoveredFeature === i ? "text-[#444]" : "text-[#666]"}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price comparison - playful */}
      <section className="relative z-10 px-6 py-24 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black mb-16 text-center">
            <span className="inline-block hover:rotate-[-2deg] transition-transform cursor-default">
              QUICK
            </span>{" "}
            <span className="inline-block hover:rotate-[2deg] transition-transform cursor-default">
              MATH
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="text-sm text-[#666] mb-2">FRAME.IO (5 USERS)</div>
              <div className="text-5xl font-black line-through text-[#444] group-hover:rotate-[-3deg] transition-transform">
                $1,140
              </div>
              <div className="text-sm text-[#666] mt-2">per year</div>
            </div>

            <div className="flex items-center justify-center">
              <span className="text-4xl text-[#333] group-hover:scale-125 transition-transform">→</span>
            </div>

            <div className="group">
              <div className="text-sm text-[#7cb87c] mb-2">LAWN (∞ USERS)</div>
              <div className="text-5xl font-black text-[#7cb87c] group-hover:rotate-[3deg] group-hover:scale-110 transition-transform">
                $60
              </div>
              <div className="text-sm text-[#666] mt-2">per year</div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="inline-block bg-[#7cb87c] text-[#111] px-8 py-4 font-black text-2xl hover:rotate-[-1deg] transition-transform">
              SAVE $1,080
            </div>
          </div>
        </div>
      </section>

      {/* How it works - minimal */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
            {[
              { step: "1", text: "UPLOAD" },
              { step: "2", text: "SHARE" },
              { step: "3", text: "REVIEW" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <span className="text-6xl font-black text-[#222] group-hover:text-[#7cb87c] transition-colors">
                  {item.step}
                </span>
                <span className="text-2xl font-black group-hover:translate-x-2 transition-transform">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl sm:text-8xl font-black mb-8">
            <span className="inline-block hover:rotate-[-3deg] hover:text-[#7cb87c] transition-all cursor-default">
              SOLD
            </span>
            <span className="inline-block hover:rotate-[3deg] transition-all cursor-default">
              ?
            </span>
          </h2>

          <Link
            href="/sign-up"
            className="inline-block bg-[#eee] text-[#111] px-16 py-6 text-2xl font-black hover:bg-[#7cb87c] hover:rotate-[-1deg] hover:scale-105 transition-all"
          >
            START FREE TRIAL
          </Link>

          <p className="mt-8 text-sm text-[#666]">
            $5/month • unlimited seats • no nonsense
          </p>
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
