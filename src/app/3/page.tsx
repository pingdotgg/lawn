"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * VARIANT 3: TERMINAL / HACKER AESTHETIC
 *
 * Green on black. Monospace everything.
 * Retro terminal vibes with modern functionality.
 * Matrix-inspired with scan lines and flicker effects.
 */

function TypeWriter({ text, delay = 50 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay]);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span>
      {displayed}
      <span className={cursorVisible ? "opacity-100" : "opacity-0"}>█</span>
    </span>
  );
}

export default function HomePage3() {
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBootComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono selection:bg-green-400 selection:text-black">
      {/* Scan lines */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.1) 2px, rgba(0, 255, 0, 0.1) 4px)",
          }}
        />
      </div>

      {/* CRT glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/[0.02] via-transparent to-green-500/[0.02]" />
        <div
          className="absolute inset-0"
          style={{
            boxShadow: "inset 0 0 150px rgba(0, 255, 0, 0.03)",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-green-400/20 bg-black/90 backdrop-blur">
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/" className="text-sm">
            [REVIEWFLOW_v2.4.1]
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/sign-in"
              className="hover:text-green-300 transition-colors"
            >
              ./login
            </Link>
            <Link href="/sign-up">
              <Button className="bg-green-400 text-black hover:bg-green-300 rounded-none text-xs h-8 px-4 font-mono">
                ./signup --new
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-12 px-4">
        <div className="max-w-4xl mx-auto w-full">
          {/* Terminal window */}
          <div className="border border-green-400/30 bg-black/80">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-green-400/20 bg-green-400/5">
              <span className="text-xs text-green-400/60">
                reviewflow@main:~
              </span>
              <div className="flex gap-2">
                <div className="w-3 h-3 border border-green-400/40" />
                <div className="w-3 h-3 border border-green-400/40" />
                <div className="w-3 h-3 bg-green-400/40" />
              </div>
            </div>

            {/* Terminal content */}
            <div className="p-6 space-y-4 text-sm">
              <div className="text-green-400/60">
                $ reviewflow --init
              </div>
              <div className="text-green-400/60">
                [INFO] Initializing ReviewFlow system...
              </div>
              <div className="text-green-400/60">
                [OK] Frame-accurate comment engine loaded
              </div>
              <div className="text-green-400/60">
                [OK] Real-time sync protocol established
              </div>
              <div className="text-green-400/60">
                [OK] Secure sharing module ready
              </div>
              <div className="h-4" />

              {bootComplete ? (
                <>
                  <div className="text-4xl sm:text-5xl lg:text-6xl leading-tight">
                    <div>VIDEO_REVIEW</div>
                    <div className="text-green-400/40">FOR_PRECISION</div>
                    <div>TEAMS</div>
                  </div>
                  <div className="h-4" />
                  <div className="text-green-400/60 max-w-lg">
                    &gt; Frame-accurate feedback system for teams who ship.
                    <br />
                    &gt; No latency. No friction. No compromises.
                  </div>
                  <div className="h-4" />
                  <div className="flex gap-4">
                    <Link href="/sign-up">
                      <Button className="bg-green-400 text-black hover:bg-green-300 rounded-none font-mono text-sm h-10 px-6">
                        $ ./start --free
                      </Button>
                    </Link>
                    <span className="text-green-400/40 flex items-center text-xs">
                      [no credit card required]
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-2xl">
                  <TypeWriter text="LOADING REVIEWFLOW..." delay={60} />
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-px mt-6 bg-green-400/20">
            {[
              { label: "ACTIVE_USERS", value: "500+" },
              { label: "FRAMES_REVIEWED", value: "1.2M" },
              { label: "UPTIME", value: "99.9%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-black p-4">
                <div className="text-xs text-green-400/40 mb-1">
                  {stat.label}
                </div>
                <div className="text-xl">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs text-green-400/40 mb-8">
            $ cat ./features.md
          </div>

          <div className="space-y-6">
            {[
              {
                cmd: "frame_accuracy",
                title: "Frame-Accurate Comments",
                desc: "Comments attached to exact frame numbers. No ambiguity.",
                status: "ENABLED",
              },
              {
                cmd: "realtime_sync",
                title: "Real-time Synchronization",
                desc: "See feedback as it's typed. WebSocket-powered collaboration.",
                status: "ENABLED",
              },
              {
                cmd: "secure_share",
                title: "Secure Sharing Protocol",
                desc: "Password protection, expiring links, access logs.",
                status: "ENABLED",
              },
              {
                cmd: "hls_streaming",
                title: "Adaptive Streaming",
                desc: "HLS playback with automatic quality adjustment.",
                status: "ENABLED",
              },
            ].map((feature) => (
              <div
                key={feature.cmd}
                className="border border-green-400/20 p-4 hover:border-green-400/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400/60">
                    ./features/{feature.cmd}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-400/10 text-green-400">
                    [{feature.status}]
                  </span>
                </div>
                <div className="text-lg mb-1">{feature.title}</div>
                <div className="text-sm text-green-400/50">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs text-green-400/40 mb-8">
            $ reviewflow --pricing
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                tier: "FREE",
                price: "0",
                features: ["1 project", "5GB storage", "3 users"],
                cmd: "./select --tier=free",
              },
              {
                tier: "PRO",
                price: "19",
                features: ["Unlimited projects", "100GB storage", "10 users"],
                cmd: "./select --tier=pro",
                featured: true,
              },
              {
                tier: "TEAM",
                price: "49",
                features: ["Unlimited all", "500GB storage", "∞ users"],
                cmd: "./select --tier=team",
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`border p-6 ${
                  plan.featured
                    ? "border-green-400 bg-green-400/5"
                    : "border-green-400/20"
                }`}
              >
                <div className="text-xs text-green-400/40 mb-2">
                  TIER_{plan.tier}
                </div>
                <div className="text-4xl mb-4">${plan.price}<span className="text-sm text-green-400/40">/mo</span></div>
                <div className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="text-sm text-green-400/60">
                      &gt; {f}
                    </div>
                  ))}
                </div>
                <Link href="/sign-up" className="block">
                  <Button
                    className={`w-full rounded-none font-mono text-xs ${
                      plan.featured
                        ? "bg-green-400 text-black hover:bg-green-300"
                        : "bg-green-400/10 text-green-400 hover:bg-green-400/20"
                    }`}
                  >
                    {plan.cmd}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-xs text-green-400/40 mb-8">
            $ reviewflow --deploy
          </div>
          <div className="text-3xl sm:text-4xl mb-6">
            READY_TO_SHIP?
          </div>
          <div className="text-green-400/50 mb-8">
            &gt; Initialize your workflow. No installation required.
          </div>
          <Link href="/sign-up">
            <Button className="bg-green-400 text-black hover:bg-green-300 rounded-none font-mono text-sm h-12 px-8">
              $ ./init --start
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-green-400/20 py-6 px-4">
        <div className="max-w-4xl mx-auto flex justify-between text-xs text-green-400/40">
          <span>[REVIEWFLOW_SYSTEM]</span>
          <span>BUILD_2024.01.30</span>
        </div>
      </footer>
    </div>
  );
}
