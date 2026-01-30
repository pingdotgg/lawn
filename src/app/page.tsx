"use client";

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";

function FilmGrain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]">
      <svg className="w-full h-full">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}

function SprocketHoles({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`fixed top-0 bottom-0 w-8 z-40 pointer-events-none hidden xl:flex flex-col justify-between py-8 ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          className="w-4 h-6 rounded-sm bg-white/[0.02] border border-white/[0.04]"
          style={{
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

function FloatingComment({
  name,
  time,
  message,
  avatar,
  delay,
  position,
}: {
  name: string;
  time: string;
  message: string;
  avatar: string;
  delay: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`absolute w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl shadow-black/50 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={position}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex-shrink-0"
          style={{ background: avatar }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-medium text-sm text-white/90">{name}</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
              {time}
            </span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

function TimelineMarker({
  position,
  color,
  delay,
  pulse = false,
}: {
  position: number;
  color: string;
  delay: number;
  pulse?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-500 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-0"
      } ${pulse ? "animate-pulse" : ""}`}
      style={{
        left: `${position}%`,
        backgroundColor: color,
        boxShadow: `0 0 20px ${color}`,
      }}
    />
  );
}

export default function HomePage() {
  const { userId, isLoaded } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && userId) {
      redirect("/dashboard");
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <FilmGrain />
      <SprocketHoles side="left" />
      <SprocketHoles side="right" />

      {/* Cinematic light leaks */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-[40vh] -right-[20vw] w-[80vw] h-[80vh] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />
        <div
          className="absolute top-[60vh] -left-[20vw] w-[60vw] h-[60vh] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.12) 0%, transparent 70%)",
            transform: `translateY(${scrollY * -0.05}px)`,
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-amber-500 rounded-lg opacity-0 group-hover:opacity-20 blur-lg transition-opacity" />
              <div className="relative w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-black"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4zm11 4l5 4-5 4V8z" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-semibold tracking-tight">
              ReviewFlow
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-white text-black hover:bg-white/90 font-medium px-6">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-20"
      >
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left column - Typography */}
            <div className="lg:col-span-5 relative z-10">
              {/* Film reel badge */}
              <div
                className="inline-flex items-center gap-3 mb-8"
                style={{
                  opacity: Math.max(0, 1 - scrollY / 400),
                  transform: `translateY(${scrollY * 0.1}px)`,
                }}
              >
                <div className="flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-cyan-400"
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-white/50 font-mono tracking-wider uppercase">
                  Now in open beta
                </span>
              </div>

              {/* Main headline */}
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-8"
                style={{
                  opacity: Math.max(0, 1 - scrollY / 600),
                  transform: `translateY(${scrollY * 0.15}px)`,
                }}
              >
                <span className="block text-white">Where</span>
                <span className="block relative">
                  <span className="relative z-10 bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    feedback
                  </span>
                </span>
                <span className="block text-white">meets the</span>
                <span className="block relative">
                  <span className="text-amber-400">frame.</span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-amber-400/30"
                    viewBox="0 0 200 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,6 Q50,12 100,6 T200,6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </span>
              </h1>

              {/* Subheadline */}
              <p
                className="text-lg text-white/50 max-w-md mb-10 leading-relaxed"
                style={{
                  opacity: Math.max(0, 1 - scrollY / 500),
                  transform: `translateY(${scrollY * 0.12}px)`,
                }}
              >
                Frame-accurate video reviews for teams who refuse to settle.
                Upload. Comment. Ship.
              </p>

              {/* CTA */}
              <div
                className="flex flex-wrap items-center gap-4"
                style={{
                  opacity: Math.max(0, 1 - scrollY / 400),
                  transform: `translateY(${scrollY * 0.1}px)`,
                }}
              >
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-semibold text-base shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
                  >
                    Start reviewing free
                    <svg
                      className="w-5 h-5 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Button>
                </Link>
                <span className="text-sm text-white/30">
                  No credit card required
                </span>
              </div>

              {/* Social proof ticker */}
              <div
                className="mt-16 flex items-center gap-6"
                style={{
                  opacity: Math.max(0, 1 - scrollY / 300),
                }}
              >
                <div className="flex -space-x-3">
                  {["from-violet-500 to-purple-600", "from-cyan-500 to-teal-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600"].map(
                    (gradient, i) => (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-full border-2 border-black bg-gradient-to-br ${gradient}`}
                        style={{ zIndex: 4 - i }}
                      />
                    )
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-white/80">500+ creators</span>
                  <span className="text-white/30 mx-2">·</span>
                  <span className="text-white/50">shipping faster</span>
                </div>
              </div>
            </div>

            {/* Right column - Interactive video mockup */}
            <div className="lg:col-span-7 relative">
              <div
                className="relative"
                style={{
                  transform: `translateY(${scrollY * -0.05}px) rotateX(${Math.min(scrollY * 0.02, 5)}deg)`,
                  perspective: "1000px",
                }}
              >
                {/* Ambient glow */}
                <div className="absolute -inset-12 bg-gradient-to-r from-cyan-500/10 via-transparent to-amber-500/10 rounded-3xl blur-3xl" />

                {/* Frame counter */}
                <div className="absolute -top-6 -left-4 z-20 font-mono text-xs text-white/30 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>REC 00:01:24:18</span>
                </div>

                {/* Main player container */}
                <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                  {/* Title bar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                      </div>
                      <span className="text-sm text-white/40 font-mono">
                        product_launch_v3_FINAL.mp4
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        4K
                      </span>
                      <span>23.976 fps</span>
                    </div>
                  </div>

                  {/* Video area */}
                  <div className="aspect-video bg-gradient-to-br from-zinc-900 to-black relative overflow-hidden">
                    {/* Fake video frame with cinematic bars */}
                    <div className="absolute inset-0 flex flex-col">
                      <div className="h-[8%] bg-black" />
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 via-zinc-900/50 to-black" />
                        {/* Abstract "video" content */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-amber-500/20 blur-2xl" />
                        </div>
                      </div>
                      <div className="h-[8%] bg-black" />
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-105 transition-all group">
                        <svg
                          className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Floating comments */}
                    <FloatingComment
                      name="Sarah Chen"
                      time="00:42"
                      message="Love this transition! Can we extend it by 2-3 frames?"
                      avatar="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                      delay={800}
                      position={{ top: "12%", right: "4%" }}
                    />
                    <FloatingComment
                      name="Marcus Rivera"
                      time="01:18"
                      message="Color grade feels slightly warm here—intentional?"
                      avatar="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
                      delay={1400}
                      position={{ bottom: "20%", left: "4%" }}
                    />
                  </div>

                  {/* Timeline */}
                  <div className="px-4 py-4 bg-black/60 border-t border-white/5">
                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                      {/* Progress */}
                      <div className="absolute inset-y-0 left-0 w-[38%] bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" />

                      {/* Comment markers */}
                      <TimelineMarker
                        position={15}
                        color="#8b5cf6"
                        delay={1000}
                        pulse
                      />
                      <TimelineMarker
                        position={38}
                        color="#06b6d4"
                        delay={1600}
                      />
                      <TimelineMarker
                        position={67}
                        color="#f59e0b"
                        delay={2200}
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                        </button>
                        <span className="text-sm font-mono text-white/40">
                          01:24 / 03:45
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                          <span>3 comments</span>
                        </div>
                        <span className="text-white/20">|</span>
                        <span>1 resolved</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-white/5 rounded-lg -z-10" />
                <div className="absolute -bottom-8 -right-8 w-32 h-32 border border-white/5 rounded-lg -z-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            opacity: Math.max(0, 1 - scrollY / 200),
          }}
        >
          <span className="text-xs text-white/30 uppercase tracking-widest">
            Scroll
          </span>
          <div className="w-6 h-10 border border-white/20 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-white/40 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
              <span className="text-sm text-white/50 uppercase tracking-wider">
                Features
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-white">Built for</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-teal-400 bg-clip-text text-transparent">
                perfectionists.
              </span>
            </h2>
            <p className="text-lg text-white/40 max-w-xl mx-auto">
              Every frame matters. Every piece of feedback counts. We built
              ReviewFlow for teams who sweat the details.
            </p>
          </div>

          {/* Feature grid - asymmetric layout */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Large feature card */}
            <div className="lg:col-span-7 group">
              <div className="relative h-full p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-500/5 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-7 h-7 text-cyan-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">
                    Frame-accurate comments
                  </h3>
                  <p className="text-white/50 leading-relaxed max-w-md">
                    Click anywhere on the timeline. Your feedback lands on that
                    exact frame. No more "around the 2 minute mark"—just
                    precision.
                  </p>
                </div>

                {/* Decorative timeline */}
                <div className="absolute bottom-8 left-8 right-8 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" />
                  <div className="absolute top-1/2 left-[20%] -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50" />
                </div>
              </div>
            </div>

            {/* Stacked smaller cards */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/5 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-7 h-7 text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Instant playback
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Adaptive HLS streaming. Smooth playback on any connection.
                    Your clients see what you see.
                  </p>
                </div>
              </div>

              <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-500/5 to-transparent" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-7 h-7 text-violet-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Share with anyone
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Secure links for clients. Optional passwords. Expiration
                    dates. Total control.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Cinematic reveal */}
      <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
        {/* Background treatment */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left - Steps */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
                <span className="text-sm text-white/50 uppercase tracking-wider">
                  Workflow
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-12">
                <span className="text-white">Three steps.</span>
                <br />
                <span className="text-white/40">Zero friction.</span>
              </h2>

              <div className="space-y-10">
                {[
                  {
                    num: "01",
                    title: "Upload",
                    desc: "Drag. Drop. Done. Files up to 10GB with resumable uploads.",
                    color: "cyan",
                  },
                  {
                    num: "02",
                    title: "Invite",
                    desc: "Add team members or generate a share link. They're reviewing in seconds.",
                    color: "amber",
                  },
                  {
                    num: "03",
                    title: "Ship",
                    desc: "Collect feedback in real-time. Resolve. Iterate. Deliver.",
                    color: "violet",
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-6 group">
                    <div
                      className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-${step.color}-500/10 border border-${step.color}-500/20 flex items-center justify-center font-mono text-lg ${
                        step.color === "cyan"
                          ? "text-cyan-400"
                          : step.color === "amber"
                          ? "text-amber-400"
                          : "text-violet-400"
                      } group-hover:scale-110 transition-transform`}
                      style={{
                        background:
                          step.color === "cyan"
                            ? "rgba(6, 182, 212, 0.1)"
                            : step.color === "amber"
                            ? "rgba(245, 158, 11, 0.1)"
                            : "rgba(139, 92, 246, 0.1)",
                        borderColor:
                          step.color === "cyan"
                            ? "rgba(6, 182, 212, 0.2)"
                            : step.color === "amber"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(139, 92, 246, 0.2)",
                      }}
                    >
                      {step.num}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {step.title}
                      </h3>
                      <p className="text-white/50 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-cyan-500/5 via-transparent to-amber-500/5 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 rounded-3xl p-6 lg:p-8">
                {/* Mini project card mockup */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600" />
                      <div>
                        <div className="font-medium">Product Launch v3</div>
                        <div className="text-sm text-white/40">
                          Updated 2m ago
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                      Ready for review
                    </div>
                  </div>

                  <div className="aspect-video rounded-xl bg-black/40 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 to-black" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-white/40">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <span>3 comments</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40">
                        <svg
                          className="w-4 h-4 text-emerald-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>2 resolved</span>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {[
                        "from-cyan-500 to-teal-600",
                        "from-violet-500 to-purple-600",
                      ].map((gradient, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full border-2 border-zinc-900 bg-gradient-to-br ${gradient}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 px-6 lg:px-12">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
              <span className="text-sm text-white/50 uppercase tracking-wider">
                Pricing
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              <span className="text-white">Simple.</span>{" "}
              <span className="text-white/40">Transparent.</span>
            </h2>
            <p className="text-lg text-white/40">
              Start free. Scale when you're ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10">
              <div className="mb-8">
                <h3 className="text-white/60 font-medium mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-white/40">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {["1 project", "5GB storage", "3 team members"].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-white/50"
                  >
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white/40"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block">
                <Button
                  variant="outline"
                  className="w-full h-12 border-white/10 hover:bg-white/5 text-white"
                >
                  Get started
                </Button>
              </Link>
            </div>

            {/* Pro - Featured */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 border border-cyan-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 text-xs font-medium bg-cyan-500 text-black rounded-full">
                  Most popular
                </span>
              </div>
              <div className="mb-8">
                <h3 className="text-cyan-400 font-medium mb-2">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$19</span>
                  <span className="text-white/40">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Unlimited projects",
                  "100GB storage",
                  "10 team members",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-cyan-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block">
                <Button className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                  Start free trial
                </Button>
              </Link>
            </div>

            {/* Team */}
            <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10">
              <div className="mb-8">
                <h3 className="text-white/60 font-medium mb-2">Team</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$49</span>
                  <span className="text-white/40">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Unlimited projects",
                  "500GB storage",
                  "Unlimited members",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-white/50"
                  >
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white/40"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block">
                <Button
                  variant="outline"
                  className="w-full h-12 border-white/10 hover:bg-white/5 text-white"
                >
                  Contact sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Dramatic */}
      <section className="relative py-32 px-6 lg:px-12 overflow-hidden">
        {/* Cinematic lighting */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-cyan-500/10 via-transparent to-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="text-white">Ready to ship</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              faster?
            </span>
          </h2>
          <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
            Join 500+ creative teams who've upgraded their review workflow.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="h-16 px-12 text-lg bg-white text-black hover:bg-white/90 font-semibold shadow-2xl shadow-white/10"
            >
              Start reviewing for free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 lg:px-12">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-black"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4zm11 4l5 4-5 4V8z" />
              </svg>
            </div>
            <span className="font-medium">ReviewFlow</span>
          </div>
          <p className="text-sm text-white/30">
            Built for creators who care about feedback.
          </p>
        </div>
      </footer>
    </div>
  );
}
