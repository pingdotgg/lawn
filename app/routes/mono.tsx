import { useState, useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/mono")({
  component: HomepageMono,
});

export default function HomepageMono() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f0e8] font-mono text-[#1a1a1a]">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between bg-[#f0f0e8] px-6 py-4">
        <div className="flex items-center gap-4">
          <span
            className={`text-xl font-black transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}
          >
            lawn
          </span>
          <span
            className={`hidden border-l border-[#ccc] pl-4 text-xs text-[#888] transition-opacity duration-200 sm:inline ${scrolled ? "opacity-100" : "opacity-0"}`}
          >
            video review
          </span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link to="/sign-in" className="hover:underline">
            Sign In
          </Link>
          <Link to="/sign-up" className="font-bold underline underline-offset-4">
            Start
          </Link>
        </div>
      </nav>

      {/* Hero - Massive brand + clear statement */}
      <section className="px-6 pt-8 pb-16">
        <div className="mx-auto max-w-6xl">
          {/* Giant lawn */}
          <h1 className="text-[20vw] leading-[0.85] font-black tracking-tight sm:text-[18vw]">
            lawn
          </h1>

          {/* What it is - immediately clear */}
          <div className="mt-8 max-w-2xl">
            <p className="text-2xl leading-tight font-bold sm:text-3xl">
              Video review for creative teams.
              <br />
              <span className="text-[#2d5a2d]">Less features. No bull$#!t.</span>
            </p>
          </div>

          {/* Key differentiator */}
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <div className="bg-[#2d5a2d] px-6 py-4 text-[#f0f0e8]">
              <span className="text-3xl font-black">$5/mo</span>
              <span className="ml-2 text-sm opacity-70">unlimited seats</span>
            </div>
            <Link
              to="/sign-up"
              className="border-2 border-[#1a1a1a] px-6 py-4 font-bold transition-colors hover:bg-[#1a1a1a] hover:text-[#f0f0e8]"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </section>

      {/* Simple value props */}
      <section className="border-y-2 border-[#1a1a1a]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Frame-accurate", desc: "Comments on exact frames" },
            { title: "Unlimited seats", desc: "One price for everyone" },
            { title: "0.3s response", desc: "Built for speed" },
            { title: "Any NLE", desc: "No lock-in" },
          ].map((item, i) => (
            <div
              key={i}
              className={`p-6 ${i < 3 ? "border-r-2 border-[#1a1a1a]" : ""} ${i < 2 ? "lg:border-r-2" : "lg:border-r-0"}`}
            >
              <div className="font-black">{item.title}</div>
              <div className="text-sm text-[#888]">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison - straightforward */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-black">How lawn compares</h2>
          <p className="mb-8 text-[#888]">Frame.io is solid software. Here's where we differ.</p>

          <div className="space-y-6">
            {/* Pricing comparison - the big one */}
            <div className="bg-[#1a1a1a] p-8 text-[#f0f0e8]">
              <div className="mb-4 text-sm tracking-widest text-[#7cb87c]">PRICING MODEL</div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm text-[#888]">Frame.io</div>
                  <div className="text-2xl font-black">$19/editor/mo</div>
                  <div className="mt-2 text-sm text-[#888]">Team of 5 = $1,140/year</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-[#7cb87c]">lawn</div>
                  <div className="text-2xl font-black text-[#7cb87c]">$5/mo total</div>
                  <div className="mt-2 text-sm text-[#888]">Team of 5 = $60/year</div>
                </div>
              </div>
              <div className="mt-6 border-t border-[#333] pt-6">
                <span className="text-sm text-[#888]">Annual savings with 5 users: </span>
                <span className="text-xl font-black text-[#7cb87c]">$1,080</span>
              </div>
            </div>

            {/* Other differences */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="border-2 border-[#1a1a1a] p-6">
                <div className="mb-2 font-black">Frame.io</div>
                <ul className="space-y-1 text-sm text-[#888]">
                  <li>• Deep Adobe integration</li>
                  <li>• More enterprise features</li>
                  <li>• Larger ecosystem</li>
                </ul>
              </div>
              <div className="border-2 border-[#2d5a2d] p-6">
                <div className="mb-2 font-black text-[#2d5a2d]">lawn</div>
                <ul className="space-y-1 text-sm">
                  <li>• Works with any software</li>
                  <li>• Simpler, faster interface</li>
                  <li>• No per-seat pricing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - visual */}
      <section className="bg-[#1a1a1a] px-6 py-16 text-[#f0f0e8]">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-2xl font-black">How it works</h2>

          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            {[
              { step: "1", action: "Upload", desc: "your video" },
              { step: "2", action: "Share", desc: "the link" },
              { step: "3", action: "Click", desc: "to comment" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center bg-[#2d5a2d] text-3xl font-black">
                  {item.step}
                </span>
                <div>
                  <div className="text-xl font-black">{item.action}</div>
                  <div className="text-sm text-[#888]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="border-b-2 border-[#1a1a1a] px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <blockquote className="text-2xl leading-tight font-bold sm:text-3xl">
            "I built lawn because I got tired of waiting for Frame.io to load. Video review should
            be instant."
          </blockquote>
          <p className="mt-4 text-[#888]">
            —{" "}
            <a
              href="https://x.com/theo"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#1a1a1a]"
            >
              Theo
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-black sm:text-6xl">Pick your plan</h2>
          <p className="mt-4 mb-8 text-xl text-[#888]">Basic is $5/month. Pro is $25/month.</p>
          <Link
            to="/sign-up"
            className="inline-block bg-[#2d5a2d] px-12 py-5 text-xl font-black text-[#f0f0e8] transition-colors hover:bg-[#3a6a3a]"
          >
            Start with Basic
          </Link>
          <p className="mt-4 text-sm text-[#888]">Upgrade to Pro anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm">
          <span className="text-xl font-black">lawn</span>
          <div className="flex gap-6 text-[#888]">
            <a href="/github" className="hover:text-[#1a1a1a]">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
