"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * VARIANT 2: WARM EDITORIAL
 *
 * Single warm accent (amber/gold) on deep black.
 * Luxurious, editorial typography with Playfair-style serifs.
 * Elegant, premium feel with generous whitespace.
 */

export default function HomePage2() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Cursor glow */}
      <div
        className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-20 transition-transform duration-1000 ease-out"
        style={{
          background:
            "radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)",
          left: mousePos.x - 300,
          top: mousePos.y - 300,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400" />
            <span className="text-lg tracking-tight">ReviewFlow</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button className="bg-amber-400 text-black hover:bg-amber-300 rounded-full px-6 text-sm font-medium">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative px-8">
        <div className="text-center max-w-5xl relative z-10">
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-px bg-amber-400/50" />
            <span className="text-sm text-amber-400 tracking-widest uppercase">
              Video Review Platform
            </span>
            <div className="w-12 h-px bg-amber-400/50" />
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light tracking-tight leading-[1.1] mb-8">
            Where every
            <br />
            <span className="italic text-amber-400">frame</span> finds its
            <br />
            <span className="italic text-amber-400">voice</span>
          </h1>

          <p className="text-xl text-white/40 max-w-xl mx-auto mb-12 leading-relaxed">
            Precision feedback for creative teams who understand that details
            define excellence.
          </p>

          <div className="flex items-center justify-center gap-6">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-amber-400 text-black hover:bg-amber-300 rounded-full h-14 px-10 text-base font-medium"
              >
                Begin your journey
              </Button>
            </Link>
            <span className="text-sm text-white/30">Free to start</span>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-1/4 left-[10%] w-64 h-64 border border-amber-400/10 rounded-full" />
        <div className="absolute bottom-1/4 right-[10%] w-96 h-96 border border-amber-400/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-amber-400/5 rounded-full" />
      </section>

      {/* Showcase */}
      <section className="py-32 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-8 bg-amber-400/5 rounded-3xl blur-3xl" />

            {/* Player */}
            <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/5">
              <div className="aspect-video relative">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-black/50" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-amber-400/10 backdrop-blur-sm border border-amber-400/30 flex items-center justify-center cursor-pointer hover:bg-amber-400/20 transition-colors group">
                    <svg
                      className="w-10 h-10 text-amber-400 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Floating comment */}
                <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-xl rounded-xl p-5 border border-amber-400/20 max-w-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
                    <div>
                      <div className="font-medium text-sm">Sarah Chen</div>
                      <div className="text-xs text-amber-400">Frame 1,008</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    The pacing here is exquisite. Let's extend by two frames.
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="px-6 py-4 bg-black/40">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
                </div>
                <div className="flex justify-between mt-3 text-xs text-white/40">
                  <span>01:42</span>
                  <span>03:45</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-sm text-amber-400 tracking-widest uppercase mb-4 block">
              Capabilities
            </span>
            <h2 className="text-5xl font-light tracking-tight">
              Crafted for <span className="italic text-amber-400">precision</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: "Frame Accuracy",
                desc: "Every comment anchored to the exact frame. Precision that professionals demand.",
              },
              {
                title: "Instant Playback",
                desc: "Adaptive streaming ensures smooth review sessions, regardless of connection.",
              },
              {
                title: "Secure Sharing",
                desc: "Password-protected links with expiration. Your work, your control.",
              },
            ].map((f, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 rounded-full border border-amber-400/30 flex items-center justify-center mx-auto mb-6 group-hover:bg-amber-400/10 transition-colors">
                  <span className="text-2xl text-amber-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-xl mb-3">{f.title}</h3>
                <p className="text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm text-amber-400 tracking-widest uppercase mb-4 block">
              Investment
            </span>
            <h2 className="text-5xl font-light tracking-tight">
              Choose your <span className="italic text-amber-400">path</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Starter", price: "0", features: ["1 project", "5GB storage", "3 collaborators"] },
              { name: "Professional", price: "19", features: ["Unlimited projects", "100GB storage", "10 collaborators"], featured: true },
              { name: "Studio", price: "49", features: ["Unlimited everything", "500GB storage", "Priority support"] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl ${
                  plan.featured
                    ? "bg-gradient-to-b from-amber-400/20 to-amber-400/5 border border-amber-400/30"
                    : "bg-white/[0.02] border border-white/10"
                }`}
              >
                <div className="text-sm text-white/50 mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-light">${plan.price}</span>
                  <span className="text-white/40">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          plan.featured ? "bg-amber-400" : "bg-white/30"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="block">
                  <Button
                    className={`w-full rounded-full ${
                      plan.featured
                        ? "bg-amber-400 text-black hover:bg-amber-300"
                        : "bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    Select
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-8">
            <div className="w-8 h-8 rounded-full bg-amber-400" />
          </div>
          <h2 className="text-5xl font-light tracking-tight mb-6">
            Ready to <span className="italic text-amber-400">elevate</span>
            <br />
            your workflow?
          </h2>
          <p className="text-white/40 mb-10 max-w-md mx-auto">
            Join creative teams who've discovered a better way to collaborate.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-amber-400 text-black hover:bg-amber-300 rounded-full h-14 px-12 text-base font-medium"
            >
              Start free today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-400" />
            <span className="text-sm">ReviewFlow</span>
          </div>
          <span className="text-sm text-white/30">
            Crafted for creators
          </span>
        </div>
      </footer>
    </div>
  );
}
