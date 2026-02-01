"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Design 8: Deconstructed/Anti-Design
// Intentionally broken grid, overlapping elements, raw aesthetic
// Confrontational, punk energy

export default function Homepage8() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#111] text-[#eee] overflow-x-hidden cursor-crosshair">
      {/* Scattered background elements */}
      <div
        className="fixed text-[30vw] font-black text-[#181818] pointer-events-none select-none"
        style={{ top: "10%", left: "-5%", transform: "rotate(-5deg)" }}
      >
        $228
      </div>
      <div
        className="fixed text-[20vw] font-black text-[#1a1a1a] pointer-events-none select-none"
        style={{ bottom: "5%", right: "-10%", transform: "rotate(8deg)" }}
      >
        NO
      </div>

      {/* Mouse follower */}
      <div
        className="fixed w-4 h-4 border-2 border-[#7cb87c] pointer-events-none z-50 mix-blend-difference"
        style={{
          left: mousePos.x - 8,
          top: mousePos.y - 8,
          transition: "left 0.05s, top 0.05s",
        }}
      />

      {/* Nav - tilted */}
      <nav className="relative z-10 p-6 flex justify-between items-start">
        <div className="transform -rotate-3">
          <span className="text-4xl font-black tracking-tighter">lawn</span>
        </div>
        <div className="flex gap-4 text-sm transform rotate-1">
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

      {/* Hero section - chaotic */}
      <section className="relative z-10 min-h-[80vh] px-6 py-12 flex flex-col justify-center">
        {/* Main headline - broken apart */}
        <div className="relative">
          <h1 className="text-[15vw] font-black leading-[0.8] tracking-tighter">
            <span className="block transform -rotate-2 hover:rotate-0 transition-transform">
              FRAME.IO
            </span>
            <span className="block text-[#333] transform translate-x-[10vw] rotate-1">
              IS
            </span>
            <span className="block transform -translate-x-[5vw] -rotate-1 relative">
              ROBBERY
              <span className="absolute -right-8 top-0 text-base font-normal text-[#7cb87c] transform rotate-12">
                (kinda)
              </span>
            </span>
          </h1>

          {/* Scattered price tags */}
          <div className="absolute top-[20%] right-[10%] transform rotate-12 bg-[#7cb87c] text-[#111] px-6 py-4">
            <div className="text-xs font-bold">LAWN</div>
            <div className="text-4xl font-black">$5/mo</div>
          </div>

          <div className="absolute bottom-[10%] right-[25%] transform -rotate-6 border-2 border-[#eee] px-6 py-4 line-through opacity-50">
            <div className="text-xs font-bold">FRAME.IO</div>
            <div className="text-3xl font-black">$228/yr</div>
          </div>
        </div>

        {/* Subtext - scattered */}
        <div className="mt-16 max-w-xl">
          <p className="text-xl leading-relaxed transform -rotate-1">
            A YouTuber got tired of slow, expensive video review tools.
            <br />
            <span className="text-[#7cb87c]">So they built something better.</span>
          </p>
        </div>
      </section>

      {/* Features - brutalist boxes */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: "FRAME ACCURATE",
                desc: "COMMENTS HIT THE EXACT FRAME",
                rotate: "-1deg",
              },
              {
                label: "NO SEAT PRICING",
                desc: "ADD YOUR WHOLE TEAM FOR $5",
                rotate: "2deg",
              },
              {
                label: "ACTUALLY FAST",
                desc: "0.3S AVERAGE. NOT LYING.",
                rotate: "-2deg",
              },
              {
                label: "NO ADOBE",
                desc: "WORKS WITH LITERALLY ANYTHING",
                rotate: "1deg",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="border-2 border-[#eee] p-8 hover:bg-[#eee] hover:text-[#111] transition-colors group"
                style={{ transform: `rotate(${feature.rotate})` }}
              >
                <div className="text-xs text-[#666] group-hover:text-[#888] mb-2">
                  {feature.label}
                </div>
                <div className="text-2xl font-black">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The math - raw */}
      <section className="relative z-10 px-6 py-24 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-black mb-12 transform -rotate-1">
            DO THE MATH
          </h2>

          <div className="space-y-8 font-mono text-2xl">
            <div className="flex items-center gap-4">
              <span className="text-[#666]">frame.io × 5 editors =</span>
              <span className="font-black line-through text-[#666]">$1,140/yr</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#666]">lawn × ∞ editors =</span>
              <span className="font-black text-[#7cb87c]">$60/yr</span>
            </div>
            <div className="pt-8 border-t border-[#333]">
              <span className="text-[#666]">you save =</span>
              <span className="font-black text-[#7cb87c] text-5xl ml-4">$1,080</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - aggressive */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block transform -rotate-2">
            <h2 className="text-7xl sm:text-8xl font-black mb-8">
              STOP
              <br />
              <span className="text-[#7cb87c]">PAYING</span>
              <br />
              MORE
            </h2>
          </div>

          <Link
            href="/sign-up"
            className="inline-block bg-[#eee] text-[#111] px-16 py-6 text-2xl font-black hover:bg-[#7cb87c] transition-colors transform rotate-1 hover:rotate-0"
          >
            TRY LAWN →
          </Link>

          <p className="mt-8 text-sm text-[#666] transform -rotate-1">
            $5/month. unlimited seats. no tricks.
          </p>
        </div>
      </section>

      {/* Footer - minimal */}
      <footer className="relative z-10 border-t border-[#333] px-6 py-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm text-[#666]">
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
