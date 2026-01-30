"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * VARIANT 1: BRUTALIST MONOCHROME
 *
 * Pure black and white. No colors. Raw typography.
 * Heavy borders, stark contrasts, industrial feel.
 * Single accent: pure white on pure black.
 */

export default function HomePage1() {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/20">
        <div className="flex items-center justify-between h-16 px-6">
          <Link href="/" className="font-mono text-sm tracking-widest">
            REVIEWFLOW
          </Link>
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs text-white/50">{time}</span>
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="text-white/60 hover:text-white font-mono text-xs tracking-wider"
              >
                SIGN IN
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-white text-black hover:bg-white/90 font-mono text-xs tracking-wider rounded-none px-6">
                START
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="w-full px-6">
          <div className="max-w-7xl mx-auto">
            {/* Main headline - massive type */}
            <div className="mb-16">
              <h1 className="text-[12vw] font-bold leading-[0.85] tracking-tighter">
                FRAME
                <br />
                <span className="text-transparent [-webkit-text-stroke:2px_white]">
                  PERFECT
                </span>
                <br />
                FEEDBACK
              </h1>
            </div>

            {/* Info row */}
            <div className="grid grid-cols-12 gap-6 border-t border-white/20 pt-8">
              <div className="col-span-4">
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                  Video review platform for teams who demand precision.
                  Frame-accurate comments. Real-time collaboration. Zero
                  friction.
                </p>
              </div>

              <div className="col-span-2">
                <div className="font-mono text-xs text-white/30 mb-2">
                  [001]
                </div>
                <div className="text-sm">Upload</div>
              </div>

              <div className="col-span-2">
                <div className="font-mono text-xs text-white/30 mb-2">
                  [002]
                </div>
                <div className="text-sm">Comment</div>
              </div>

              <div className="col-span-2">
                <div className="font-mono text-xs text-white/30 mb-2">
                  [003]
                </div>
                <div className="text-sm">Ship</div>
              </div>

              <div className="col-span-2 flex justify-end">
                <Link href="/sign-up">
                  <Button className="bg-white text-black hover:bg-white/90 font-mono text-xs tracking-wider rounded-none h-12 px-8">
                    GET STARTED →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video mockup section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="border border-white/20">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
              <span className="font-mono text-xs text-white/50">
                PROJECT_FINAL_V3.MP4
              </span>
              <div className="flex gap-4 font-mono text-xs text-white/30">
                <span>4K</span>
                <span>24FPS</span>
                <span>03:45</span>
              </div>
            </div>

            {/* Video area */}
            <div className="aspect-video bg-white/[0.02] relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer group">
                  <svg
                    className="w-8 h-8 ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Comment overlay */}
              <div className="absolute top-8 right-8 border border-white/20 bg-black/90 p-4 max-w-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 border border-white/20 flex items-center justify-center font-mono text-xs">
                    SC
                  </div>
                  <div>
                    <div className="text-sm">Sarah Chen</div>
                    <div className="font-mono text-xs text-white/50">
                      @ 00:42:18
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  Extend this transition by 2 frames.
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-4 py-4 border-t border-white/20">
              <div className="h-2 bg-white/5 relative">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-white" />
                <div className="absolute top-1/2 -translate-y-1/2 left-[15%] w-2 h-4 bg-white" />
                <div className="absolute top-1/2 -translate-y-1/2 left-[42%] w-2 h-4 bg-white/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-32 px-6 border-t border-white/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-px bg-white/20">
            {[
              {
                num: "01",
                title: "Frame Accurate",
                desc: "Comments land on the exact frame. Not approximately. Exactly.",
              },
              {
                num: "02",
                title: "Real-time",
                desc: "See feedback as it happens. Collaborate without refresh.",
              },
              {
                num: "03",
                title: "Secure Sharing",
                desc: "Password protection. Expiring links. Total control.",
              },
            ].map((feature) => (
              <div key={feature.num} className="bg-black p-10">
                <div className="font-mono text-xs text-white/30 mb-6">
                  [{feature.num}]
                </div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 px-6 border-t border-white/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-6xl font-bold tracking-tighter mb-16 text-center">
            PRICING
          </h2>

          <div className="grid grid-cols-3 gap-px bg-white/20">
            {[
              { name: "FREE", price: "$0", features: ["1 project", "5GB", "3 members"] },
              { name: "PRO", price: "$19", features: ["Unlimited", "100GB", "10 members"], featured: true },
              { name: "TEAM", price: "$49", features: ["Unlimited", "500GB", "Unlimited"] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-10 ${plan.featured ? "bg-white text-black" : "bg-black"}`}
              >
                <div className="font-mono text-xs mb-4 opacity-50">
                  {plan.name}
                </div>
                <div className="text-5xl font-bold tracking-tighter mb-8">
                  {plan.price}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`text-sm ${plan.featured ? "text-black/60" : "text-white/60"}`}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="block">
                  <Button
                    className={`w-full rounded-none font-mono text-xs tracking-wider ${
                      plan.featured
                        ? "bg-black text-white hover:bg-black/90"
                        : "bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    SELECT
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-6 border-t border-white/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[8vw] font-bold tracking-tighter leading-[0.9] mb-8">
            START
            <br />
            <span className="text-transparent [-webkit-text-stroke:1px_white]">
              REVIEWING
            </span>
          </h2>
          <Link href="/sign-up">
            <Button className="bg-white text-black hover:bg-white/90 font-mono text-sm tracking-wider rounded-none h-14 px-12">
              CREATE FREE ACCOUNT →
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="font-mono text-xs text-white/30">
            © REVIEWFLOW 2024
          </span>
          <span className="font-mono text-xs text-white/30">
            BUILT FOR CREATORS
          </span>
        </div>
      </footer>
    </div>
  );
}
