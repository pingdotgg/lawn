"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1a0d] relative overflow-hidden">
      {/* Cursor glow */}
      <div
        className="pointer-events-none fixed w-[500px] h-[500px] rounded-full opacity-20 transition-transform duration-1000 ease-out"
        style={{
          background: "radial-gradient(circle, #2d5a2d 0%, transparent 70%)",
          left: mousePos.x - 250,
          top: mousePos.y - 250,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 160, 100, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 160, 100, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 px-8 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <div className="animate-in font-serif text-[1.75rem] text-[#7cb87c] italic">
          lawn
        </div>
        <div className="animate-in animation-delay-150 flex items-center gap-8">
          <Link
            href="#"
            className="font-mono text-sm text-[#5a8a5a] transition-colors hover:text-[#a0d0a0]"
          >
            how it works
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-sm px-5 py-2 border border-[#2a4a2a] rounded text-[#7cb87c] transition-all hover:bg-[#1a3a1a] hover:border-[#3a6a3a]"
          >
            sign in
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 px-8 pt-32 pb-24 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="animate-in animation-delay-150 font-mono text-sm mb-6 tracking-widest uppercase text-[#4a7a4a]">
              video collaboration
            </p>
            <h1 className="animate-in animation-delay-300 font-serif text-[clamp(2.5rem,5vw,4rem)] text-[#c8e6c8] leading-[1.1]">
              Leave feedback<br />
              <span className="italic text-[#7cb87c]">exactly</span> where<br />
              it matters
            </h1>

            <p className="animate-in animation-delay-450 mt-8 font-mono text-[0.9rem] text-[#6a9a6a] leading-relaxed max-w-[400px]">
              Click any frame. Type your note. Your team gets notified instantly.
              No more "at 2:34 on the left side..."
            </p>

            <Link
              href="/sign-up"
              className="animate-in animation-delay-600 inline-block mt-10 px-8 py-4 font-mono text-sm bg-[#2d5a2d] text-[#c8e6c8] transition-all hover:translate-x-1 hover:bg-[#3a6a3a]"
            >
              start reviewing →
            </Link>
          </div>

          {/* Visual element - stacked cards */}
          <div className="animate-in animation-delay-450 relative h-[400px] hidden lg:block">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-[320px] h-[200px] rounded-lg border border-[#1a3a1a] bg-[#0f1f0f]"
                style={{
                  top: `${i * 30}px`,
                  left: `${i * 30}px`,
                  transform: `rotate(${-3 + i * 2}deg)`,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                }}
              >
                {i === 2 && (
                  <>
                    <div className="p-4">
                      <div className="w-full h-24 rounded bg-[#1a2a1a]" />
                    </div>
                    <div className="absolute -right-3 top-1/2 px-3 py-1.5 rounded-full font-mono text-xs bg-[#7cb87c] text-[#0d1a0d]">
                      "love this shot"
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom stats */}
      <div className="relative z-10 px-8 py-16 border-t border-[#1a2a1a] max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-8">
          {[
            { value: "0.3s", label: "avg comment time" },
            { value: "100%", label: "frame accurate" },
            { value: "∞", label: "peace of mind" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-serif text-[2.5rem] text-[#7cb87c]">
                {stat.value}
              </div>
              <div className="mt-2 font-mono text-xs tracking-wider uppercase text-[#4a6a4a]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
