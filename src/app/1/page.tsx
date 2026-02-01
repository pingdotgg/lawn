"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Design 1: Kinetic Typography
// Large, bold text that responds to scroll, with floating video frames

export default function Homepage1() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const parallax = (factor: number) => scrollY * factor;

  return (
    <div
      ref={containerRef}
      className="min-h-[300vh] bg-[#050a05] text-[#c8e6c8] overflow-x-hidden"
    >
      {/* Floating gradient orbs */}
      <div
        className="fixed w-[800px] h-[800px] rounded-full opacity-20 blur-[150px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, #2d5a2d 0%, transparent 70%)",
          left: mousePos.x - 400,
          top: mousePos.y - 400,
          transition: "left 0.3s ease-out, top 0.3s ease-out",
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
        <Link href="/" className="text-2xl font-medium tracking-tight">
          lawn
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/sign-in" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm px-4 py-2 bg-[#7cb87c] text-[#050a05] rounded-full font-medium hover:bg-[#a0d0a0] transition-colors"
          >
            get started
          </Link>
        </div>
      </nav>

      {/* Hero Section - Massive Typography */}
      <section className="h-screen flex flex-col justify-center px-8 relative">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              #7cb87c 100px,
              #7cb87c 101px
            )`,
          }}
        />

        <h1
          className="text-[20vw] font-bold leading-[0.85] tracking-[-0.04em] relative z-10"
          style={{
            transform: `translateY(${parallax(-0.1)}px)`,
          }}
        >
          <span className="block text-[#7cb87c]">review</span>
          <span
            className="block ml-[15vw] opacity-40"
            style={{ transform: `translateX(${parallax(0.05)}px)` }}
          >
            faster
          </span>
        </h1>

        {/* Floating video frame */}
        <div
          className="absolute right-[10%] top-[20%] w-[300px] aspect-video bg-[#0d1a0d] border border-[#2a4a2a] rounded-lg shadow-2xl"
          style={{
            transform: `translateY(${parallax(-0.2)}px) rotate(${3 + scrollY * 0.01}deg)`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#7cb87c]/20 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[12px] border-l-[#7cb87c] border-y-[8px] border-y-transparent ml-1" />
            </div>
          </div>
          {/* Comment marker */}
          <div className="absolute bottom-4 left-6 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#7cb87c] flex items-center justify-center text-[10px] text-[#050a05] font-bold">
              T
            </div>
            <span className="text-xs text-[#6a9a6a]">this shot is perfect</span>
          </div>
        </div>
      </section>

      {/* Second Section - Features */}
      <section className="min-h-screen px-8 py-32 relative">
        <div className="max-w-6xl mx-auto">
          <p
            className="text-[8vw] font-bold leading-[1.1] tracking-[-0.02em]"
            style={{ transform: `translateY(${parallax(-0.05)}px)` }}
          >
            frame.io
            <br />
            <span className="text-[#4a6a4a] line-through decoration-[#7cb87c] decoration-4">costs $228/year</span>
          </p>

          <p
            className="text-[8vw] font-bold leading-[1.1] tracking-[-0.02em] mt-16"
            style={{ transform: `translateY(${parallax(-0.03)}px)` }}
          >
            lawn is
            <br />
            <span className="text-[#7cb87c]">$5/mo, no seat fees</span>
          </p>
        </div>

        {/* Floating elements */}
        <div
          className="absolute left-[5%] top-[40%] w-[200px] aspect-video bg-[#0d1a0d] border border-[#2a4a2a] rounded-lg opacity-50"
          style={{
            transform: `translateY(${parallax(-0.15)}px) rotate(-5deg)`,
          }}
        />
        <div
          className="absolute right-[15%] bottom-[20%] w-[250px] aspect-video bg-[#0d1a0d] border border-[#2a4a2a] rounded-lg opacity-30"
          style={{
            transform: `translateY(${parallax(-0.25)}px) rotate(8deg)`,
          }}
        />
      </section>

      {/* Third Section - Stats */}
      <section className="min-h-screen px-8 py-32 flex items-center">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-16">
          {[
            { value: "0.3s", label: "average comment time" },
            { value: "100%", label: "frame accurate" },
            { value: "$5", label: "per month, unlimited seats" },
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center"
              style={{
                transform: `translateY(${parallax(-0.05 - i * 0.02)}px)`,
              }}
            >
              <div className="text-[12vw] font-bold text-[#7cb87c] leading-none">
                {stat.value}
              </div>
              <div className="text-lg text-[#6a9a6a] mt-4">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="h-screen flex flex-col items-center justify-center px-8 relative">
        <h2 className="text-[10vw] font-bold tracking-[-0.04em] text-center leading-[0.9]">
          <span className="text-[#7cb87c]">start</span>
          <br />
          reviewing
        </h2>
        <Link
          href="/sign-up"
          className="mt-16 text-xl px-12 py-5 bg-[#7cb87c] text-[#050a05] rounded-full font-medium hover:bg-[#a0d0a0] transition-all hover:scale-105"
        >
          start your trial →
        </Link>
        <p className="mt-6 text-sm text-[#4a6a4a]">$5/month • unlimited team members</p>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-[#1a2a1a]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-sm text-[#4a6a4a]">© 2025 lawn</span>
          <div className="flex gap-8 text-sm text-[#6a9a6a]">
            <Link href="/github" className="hover:text-[#7cb87c]">github</Link>
            <Link href="/docs" className="hover:text-[#7cb87c]">docs</Link>
            <Link href="/privacy" className="hover:text-[#7cb87c]">privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
