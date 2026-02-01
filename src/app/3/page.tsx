"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// Design 3: Ambient/Atmospheric
// Soft organic shapes, gentle animations, dreamy but professional

export default function Homepage3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Animated blob particles
    const blobs: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 5; i++) {
      blobs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 200 + Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: 0.03 + Math.random() * 0.04,
      });
    }

    const animate = () => {
      ctx.fillStyle = "#080d08";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob) => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        );
        gradient.addColorStop(0, `rgba(124, 184, 124, ${blob.opacity})`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="min-h-screen bg-[#080d08] text-[#c8e6c8] relative overflow-hidden">
      {/* Animated background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
      />

      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30 z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-serif italic tracking-wide text-[#7cb87c]"
          >
            lawn
          </Link>
          <div className="flex items-center gap-12">
            <Link
              href="/about"
              className="text-sm text-[#6a9a6a] hover:text-[#a0d0a0] transition-colors"
            >
              about
            </Link>
            <Link
              href="/sign-in"
              className="text-sm text-[#6a9a6a] hover:text-[#a0d0a0] transition-colors"
            >
              sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-6 py-2.5 bg-[#7cb87c]/10 border border-[#7cb87c]/30 text-[#7cb87c] rounded-full hover:bg-[#7cb87c]/20 hover:border-[#7cb87c]/50 transition-all"
            >
              get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-20 min-h-screen flex flex-col justify-center px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light leading-[1.05] tracking-[-0.02em] mb-8">
              Where creative
              <br />
              feedback{" "}
              <span className="font-serif italic text-[#7cb87c]">flows</span>
            </h1>
            <p className="text-xl text-[#6a9a6a] leading-relaxed max-w-xl mb-12">
              A serene space for video collaboration. Leave frame-accurate comments,
              share with your team, and watch your projects come to life.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/sign-up"
                className="group flex items-center gap-3 text-lg"
              >
                <span className="w-14 h-14 rounded-full bg-[#7cb87c] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg
                    className="w-5 h-5 text-[#080d08]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
                <span className="text-[#c8e6c8] group-hover:text-[#7cb87c] transition-colors">
                  Start your journey
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating preview card */}
        <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[400px] hidden xl:block">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-8 bg-[#7cb87c]/10 rounded-3xl blur-2xl" />

            {/* Card */}
            <div className="relative bg-[#0d140d]/80 backdrop-blur-xl border border-[#2a4a2a]/50 rounded-2xl overflow-hidden">
              {/* Video preview */}
              <div className="aspect-video bg-gradient-to-br from-[#1a2a1a] to-[#0d140d] relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#7cb87c]/10 border border-[#7cb87c]/30 flex items-center justify-center backdrop-blur">
                    <div className="w-0 h-0 border-l-[14px] border-l-[#7cb87c] border-y-[9px] border-y-transparent ml-1" />
                  </div>
                </div>
                {/* Timeline */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1a3a1a]">
                  <div className="h-full w-[45%] bg-[#7cb87c]/50" />
                </div>
              </div>

              {/* Comment */}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7cb87c] to-[#4a8a4a] flex items-center justify-center text-xs text-[#080d08] font-medium">
                    M
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Maya</span>
                      <span className="text-xs text-[#4a6a4a]">1:24</span>
                    </div>
                    <p className="text-sm text-[#6a9a6a]">
                      Love this transition ✨
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-20 px-8 py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              {
                title: "Frame perfect",
                desc: "Every comment lands exactly where you intend. No guesswork, no timestamps—just precision.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: "Effortless sharing",
                desc: "One link, instant access. Your collaborators see what you see, no account required.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                ),
              },
              {
                title: "Radically simple pricing",
                desc: "$5/month, unlimited team members. No per-seat fees, no surprises.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="group">
                <div className="w-12 h-12 rounded-full bg-[#7cb87c]/10 border border-[#7cb87c]/20 flex items-center justify-center mb-6 text-[#7cb87c] group-hover:bg-[#7cb87c]/20 group-hover:border-[#7cb87c]/40 transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
                <p className="text-[#6a9a6a] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote/Testimonial */}
      <section className="relative z-20 px-8 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-3xl sm:text-4xl font-light leading-relaxed text-[#a0d0a0] mb-8">
            "I built lawn because Frame.io felt like wading through molasses.
            Now feedback happens at the speed of thought."
          </blockquote>
          <p className="text-[#6a9a6a]">— Creator of lawn</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-20 px-8 py-32">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-light mb-6">
            Ready to{" "}
            <span className="font-serif italic text-[#7cb87c]">breathe</span>?
          </h2>
          <p className="text-[#6a9a6a] mb-10">
            $5/month. Unlimited seats. Join thousands of creators who've found their flow.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#7cb87c] text-[#080d08] rounded-full font-medium hover:bg-[#a0d0a0] transition-colors"
          >
            Start your trial
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 px-8 py-12 border-t border-[#1a2a1a]/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <span className="font-serif italic text-lg text-[#7cb87c]">lawn</span>
          <div className="flex gap-8 text-sm text-[#4a6a4a]">
            <Link href="/github" className="hover:text-[#7cb87c] transition-colors">GitHub</Link>
            <Link href="/docs" className="hover:text-[#7cb87c] transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-[#7cb87c] transition-colors">Privacy</Link>
          </div>
          <span className="text-sm text-[#4a6a4a]">© 2025</span>
        </div>
      </footer>
    </div>
  );
}
