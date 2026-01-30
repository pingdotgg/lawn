"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * VARIANT 5: BOLD RED/CORAL
 *
 * Striking red accent on deep black.
 * Bold geometric shapes, high contrast.
 * Confident, powerful, attention-grabbing.
 */

export default function HomePage5() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Background gradient accent */}
      <div className="fixed top-0 right-0 w-1/2 h-screen pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-red-500/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded" />
            <span className="font-semibold tracking-tight">ReviewFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button className="bg-red-500 hover:bg-red-400 text-white rounded-lg px-5 text-sm font-medium">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400">Now in beta</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
                Ship video
                <br />
                <span className="text-red-500">faster.</span>
              </h1>

              <p className="text-xl text-white/50 max-w-md mb-10 leading-relaxed">
                Frame-accurate feedback for teams who don't have time for back-and-forth.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="bg-red-500 hover:bg-red-400 text-white rounded-lg h-14 px-8 text-base font-semibold"
                  >
                    Start free
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Button>
                </Link>
                <span className="text-sm text-white/30">No credit card</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 mt-16 pt-8 border-t border-white/10">
                {[
                  { value: "500+", label: "Creators" },
                  { value: "1.2M", label: "Frames reviewed" },
                  { value: "99.9%", label: "Uptime" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-red-500">{stat.value}</div>
                    <div className="text-sm text-white/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              {/* Red glow */}
              <div className="absolute -inset-8 bg-red-500/10 rounded-3xl blur-3xl" />

              {/* Player mockup */}
              <div className="relative bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-white/50">final_cut_v3.mp4</span>
                  </div>
                  <span className="text-xs text-white/30">4K • 24fps</span>
                </div>

                {/* Video */}
                <div className="aspect-video bg-black relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center cursor-pointer hover:bg-red-500/30 transition-colors">
                      <svg className="w-8 h-8 text-red-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="absolute top-4 right-4 bg-[#0a0a0a]/90 backdrop-blur rounded-xl p-4 border border-red-500/20 max-w-xs">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-500" />
                      <div>
                        <div className="text-sm font-medium">Sarah</div>
                        <div className="text-xs text-red-400">00:42:18</div>
                      </div>
                    </div>
                    <p className="text-sm text-white/60">Extend by 2 frames.</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-4 py-3 border-t border-white/10">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-red-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Built for <span className="text-red-500">speed</span>
            </h2>
            <p className="text-white/40">Everything you need, nothing you don't</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Frame Accurate",
                desc: "Comments pinned to the exact frame. No more guessing.",
                num: "01",
              },
              {
                title: "Real-time",
                desc: "See feedback as it happens. Zero refresh required.",
                num: "02",
              },
              {
                title: "Secure",
                desc: "Password protection. Expiring links. Full control.",
                num: "03",
              },
            ].map((feature, i) => (
              <div
                key={feature.num}
                className={`p-8 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  hoveredFeature === i
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                }`}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div
                  className={`text-4xl font-bold mb-4 transition-colors ${
                    hoveredFeature === i ? "text-red-500" : "text-white/10"
                  }`}
                >
                  {feature.num}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/40">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Simple <span className="text-red-500">pricing</span>
            </h2>
            <p className="text-white/40">Start free. Scale when ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Free", price: "0", features: ["1 project", "5GB", "3 members"] },
              { name: "Pro", price: "19", features: ["Unlimited", "100GB", "10 members"], featured: true },
              { name: "Team", price: "49", features: ["Unlimited", "500GB", "∞ members"] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl ${
                  plan.featured
                    ? "bg-red-500 text-white"
                    : "bg-white/[0.02] border border-white/10"
                }`}
              >
                <div className={`text-sm mb-2 ${plan.featured ? "text-white/80" : "text-white/50"}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className={plan.featured ? "text-white/60" : "text-white/40"}>/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-center gap-2 text-sm ${
                        plan.featured ? "text-white/80" : "text-white/50"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="block">
                  <Button
                    className={`w-full rounded-lg font-medium ${
                      plan.featured
                        ? "bg-white text-red-500 hover:bg-white/90"
                        : "bg-red-500 text-white hover:bg-red-400"
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
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 rounded-3xl bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/20 text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Ready to ship <span className="text-red-500">faster?</span>
              </h2>
              <p className="text-white/50 mb-8 max-w-md mx-auto">
                Join 500+ creators who've upgraded their review workflow.
              </p>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-red-500 hover:bg-red-400 text-white rounded-lg h-14 px-10 text-base font-semibold"
                >
                  Start for free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded" />
            <span className="text-sm font-medium">ReviewFlow</span>
          </div>
          <span className="text-sm text-white/30">Built for creators</span>
        </div>
      </footer>
    </div>
  );
}
