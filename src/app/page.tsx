"use client";

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { userId, isLoaded } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isLoaded && userId) {
      redirect("/dashboard");
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white overflow-hidden">
      {/* Cursor glow */}
      <div
        className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-15 transition-transform duration-1000 ease-out"
        style={{
          background:
            "radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)",
          left: mousePos.x - 300,
          top: mousePos.y - 300,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500" />
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
              <Button className="bg-red-500 text-white hover:bg-red-400 rounded-full px-6 text-sm font-medium">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative px-8">
        <div className="text-center max-w-5xl relative z-10">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light tracking-tight leading-[1.1] mb-8">
            Video review
            <br />
            <span className="italic text-red-500">without</span> the
            <br />
            back-and-forth
          </h1>

          <p className="text-xl text-white/40 max-w-lg mx-auto mb-12 leading-relaxed">
            Click any frame. Leave a comment. Your team sees it instantly.
          </p>

          <div className="flex items-center justify-center gap-6">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-red-500 text-white hover:bg-red-400 rounded-full h-14 px-10 text-base font-medium"
              >
                Try it free
              </Button>
            </Link>
            <span className="text-sm text-white/30">No credit card</span>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-1/4 left-[10%] w-64 h-64 border border-red-500/10 rounded-full" />
        <div className="absolute bottom-1/4 right-[10%] w-96 h-96 border border-red-500/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-red-500/5 rounded-full" />
      </section>

      {/* Showcase */}
      <section className="py-32 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-8 bg-red-500/5 rounded-3xl blur-3xl" />

            {/* Player */}
            <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/5">
              <div className="aspect-video relative">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-black/50" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-red-500/10 backdrop-blur-sm border border-red-500/30 flex items-center justify-center cursor-pointer hover:bg-red-500/20 transition-colors group">
                    <svg
                      className="w-10 h-10 text-red-500 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Floating comment */}
                <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-xl rounded-xl p-5 border border-red-500/20 max-w-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
                    <div>
                      <div className="font-medium text-sm">Sarah</div>
                      <div className="text-xs text-red-400">Frame 1,008</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Extend this by two frames.
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="px-6 py-4 bg-black/40">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-gradient-to-r from-red-600 to-red-500 rounded-full" />
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
            <h2 className="text-5xl font-light tracking-tight">
              How it <span className="italic text-red-500">works</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: "Click any frame",
                desc: "Your comment attaches to that exact moment. Not \"around 2 minutes in.\" The exact frame.",
              },
              {
                title: "Share a link",
                desc: "Clients don't need accounts. Send them a link. They watch, they comment, done.",
              },
              {
                title: "Ship faster",
                desc: "No more email chains. No more \"which version?\" Everything in one place.",
              },
            ].map((f, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 rounded-full border border-red-500/30 flex items-center justify-center mx-auto mb-6 group-hover:bg-red-500/10 transition-colors">
                  <span className="text-2xl text-red-500">
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
            <h2 className="text-5xl font-light tracking-tight">
              <span className="italic text-red-500">Pricing</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "0",
                features: ["1 project", "5GB storage", "3 collaborators"],
              },
              {
                name: "Pro",
                price: "19",
                features: [
                  "Unlimited projects",
                  "100GB storage",
                  "10 collaborators",
                ],
                featured: true,
              },
              {
                name: "Team",
                price: "49",
                features: [
                  "Unlimited everything",
                  "500GB storage",
                  "Priority support",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl ${
                  plan.featured
                    ? "bg-gradient-to-b from-red-500/20 to-red-500/5 border border-red-500/30"
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
                    <li
                      key={f}
                      className="flex items-center gap-3 text-sm text-white/60"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          plan.featured ? "bg-red-500" : "bg-white/30"
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
                        ? "bg-red-500 text-white hover:bg-red-400"
                        : "bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    {plan.price === "0" ? "Get started" : "Start trial"}
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
          <h2 className="text-5xl font-light tracking-tight mb-6">
            Ready to <span className="italic text-red-500">try it?</span>
          </h2>
          <p className="text-white/40 mb-10 max-w-md mx-auto">
            Set up takes about 30 seconds. Upload a video and see for yourself.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-red-500 text-white hover:bg-red-400 rounded-full h-14 px-12 text-base font-medium"
            >
              Start free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-500" />
            <span className="text-sm">ReviewFlow</span>
          </div>
          <span className="text-sm text-white/30">Made for creators</span>
        </div>
      </footer>
    </div>
  );
}
