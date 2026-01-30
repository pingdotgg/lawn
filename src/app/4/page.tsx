"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";

/**
 * VARIANT 4: ETHEREAL VIOLET
 *
 * Single color family: violet/purple.
 * Soft gradients, dreamy atmosphere, floating elements.
 * Glassmorphism with subtle depth.
 */

function FloatingOrb({
  size,
  position,
  delay,
}: {
  size: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  delay: number;
}) {
  return (
    <div
      className="absolute rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/10 blur-3xl animate-pulse"
      style={{
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        animationDuration: "8s",
        ...position,
      }}
    />
  );
}

export default function HomePage4() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#08070b] text-white overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingOrb size={600} position={{ top: "-10%", right: "-10%" }} delay={0} />
        <FloatingOrb size={400} position={{ bottom: "20%", left: "-5%" }} delay={2} />
        <FloatingOrb size={300} position={{ top: "40%", right: "20%" }} delay={4} />
      </div>

      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <svg className="w-full h-full">
          <filter id="noise4">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise4)" />
        </svg>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between px-6 py-3 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.05]">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600" />
              <span className="font-medium">ReviewFlow</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2"
              >
                Sign in
              </Link>
              <Link href="/sign-up">
                <Button className="bg-violet-500 hover:bg-violet-400 text-white rounded-full px-6 text-sm">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center px-6 relative">
        <div
          className="text-center max-w-4xl relative z-10"
          style={{
            transform: `translateY(${scrollY * 0.2}px)`,
            opacity: Math.max(0, 1 - scrollY / 500),
          }}
        >
          {/* Floating badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-sm text-violet-300">Now in beta</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] mb-6">
            Video feedback
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-violet-400 bg-clip-text text-transparent">
              made magical
            </span>
          </h1>

          <p className="text-lg text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
            Frame-perfect comments. Real-time collaboration. A review experience
            that feels like the future.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white rounded-full h-14 px-8 text-base shadow-lg shadow-violet-500/25"
              >
                Start for free
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 mt-16">
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-[#08070b] bg-gradient-to-br from-violet-400/80 to-purple-600/80"
                  style={{ zIndex: 4 - i }}
                />
              ))}
            </div>
            <span className="text-sm text-white/40">
              Trusted by 500+ creators
            </span>
          </div>
        </div>
      </section>

      {/* Player showcase */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-8 bg-gradient-to-r from-violet-500/20 via-purple-500/10 to-violet-500/20 rounded-3xl blur-3xl opacity-50" />

            {/* Glass container */}
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] overflow-hidden">
              {/* Video area */}
              <div className="aspect-video relative bg-gradient-to-br from-violet-900/20 to-black/50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Comment card */}
                <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10 max-w-xs">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-600" />
                    <div>
                      <div className="font-medium text-sm">Sarah Chen</div>
                      <div className="text-xs text-violet-400">@ 00:42</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/60">
                    Beautiful transition—extend by 2 frames?
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="px-6 py-4 bg-black/20">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium tracking-tight mb-4">
              Everything you need
            </h2>
            <p className="text-white/40">
              Powerful features, beautifully simple
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Frame Accurate",
                desc: "Comments land on the exact frame, every time.",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Real-time Sync",
                desc: "See feedback instantly as your team collaborates.",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
              },
              {
                title: "Secure Sharing",
                desc: "Password protection and expiring links built in.",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-white/40 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-medium tracking-tight mb-4">
              Simple pricing
            </h2>
            <p className="text-white/40">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Free", price: "0", features: ["1 project", "5GB storage", "3 team members"] },
              { name: "Pro", price: "19", features: ["Unlimited projects", "100GB storage", "10 team members"], featured: true },
              { name: "Team", price: "49", features: ["Unlimited everything", "500GB storage", "Unlimited members"] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-2xl ${
                  plan.featured
                    ? "bg-gradient-to-b from-violet-500/20 to-purple-600/10 border border-violet-500/30"
                    : "bg-white/[0.02] border border-white/[0.06]"
                }`}
              >
                <div className="text-sm text-white/50 mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-medium">${plan.price}</span>
                  <span className="text-white/40">/mo</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <div className={`w-1.5 h-1.5 rounded-full ${plan.featured ? "bg-violet-400" : "bg-white/30"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="block">
                  <Button
                    className={`w-full rounded-full ${
                      plan.featured
                        ? "bg-violet-500 hover:bg-violet-400 text-white"
                        : "bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    Get started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 mx-auto mb-8 shadow-lg shadow-violet-500/30" />
          <h2 className="text-4xl font-medium tracking-tight mb-4">
            Ready to transform your workflow?
          </h2>
          <p className="text-white/40 mb-8">
            Join creators who've discovered a better way.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white rounded-full h-14 px-10 text-base shadow-lg shadow-violet-500/25"
            >
              Start for free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-400 to-purple-600" />
            <span className="text-sm">ReviewFlow</span>
          </div>
          <span className="text-sm text-white/30">Made for creators</span>
        </div>
      </footer>
    </div>
  );
}
