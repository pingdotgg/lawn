"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a]">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-[#f0f0e8]">
        <div className="flex items-center gap-4">
          <span className={`text-xl font-black transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>lawn</span>
          <span className={`text-xs text-[#888] hidden sm:inline border-l border-[#ccc] pl-4 transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>video review</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/sign-in" className="hover:underline">Sign In</Link>
          <Link href="/sign-up" className="font-bold underline underline-offset-4">Start Free</Link>
        </div>
      </nav>

      {/* Hero - Massive brand + clear statement */}
      <section className="px-6 pt-8 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Giant lawn */}
          <h1 className="text-[20vw] sm:text-[18vw] font-black leading-[0.85] tracking-tight">
            lawn
          </h1>

          {/* What it is - immediately clear */}
          <div className="max-w-2xl mt-8">
            <p className="text-2xl sm:text-3xl font-bold leading-tight">
              Video review for creative teams.
              <br />
              <span className="text-[#2d5a2d]">Less features. No bull$#!t.</span>
            </p>
          </div>

          {/* Key differentiator */}
          <div className="mt-12 flex flex-wrap gap-6 items-center">
            <div className="bg-[#2d5a2d] text-[#f0f0e8] px-6 py-4">
              <span className="text-3xl font-black">$5/mo</span>
              <span className="text-sm ml-2 opacity-70">unlimited seats</span>
            </div>
            <Link
              href="/sign-up"
              className="border-2 border-[#1a1a1a] px-6 py-4 font-bold hover:bg-[#1a1a1a] hover:text-[#f0f0e8] transition-colors"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      </section>

      {/* Simple value props */}
      <section className="border-y-2 border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Frame-accurate", desc: "Comments on exact frames" },
            { title: "Unlimited seats", desc: "One price for everyone" },
            { title: "0.3s response", desc: "Built for speed" },
            { title: "Any NLE", desc: "No lock-in" },
          ].map((item, i) => (
            <div key={i} className={`p-6 ${i < 3 ? 'border-r-2 border-[#1a1a1a]' : ''} ${i < 2 ? 'lg:border-r-2' : 'lg:border-r-0'}`}>
              <div className="font-black">{item.title}</div>
              <div className="text-sm text-[#888]">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison - straightforward */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black mb-2">How lawn compares</h2>
          <p className="text-[#888] mb-8">Frame.io is solid software. Here's where we differ.</p>

          <div className="space-y-6">
            {/* Pricing comparison - the big one */}
            <div className="bg-[#1a1a1a] text-[#f0f0e8] p-8">
              <div className="text-sm tracking-widest text-[#7cb87c] mb-4">PRICING MODEL</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <div className="text-[#888] text-sm mb-1">Frame.io</div>
                  <div className="text-2xl font-black">$19/editor/mo</div>
                  <div className="text-sm text-[#888] mt-2">Team of 5 = $1,140/year</div>
                </div>
                <div>
                  <div className="text-[#7cb87c] text-sm mb-1">lawn</div>
                  <div className="text-2xl font-black text-[#7cb87c]">$5/mo total</div>
                  <div className="text-sm text-[#888] mt-2">Team of 5 = $60/year</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-[#333]">
                <span className="text-sm text-[#888]">Annual savings with 5 users: </span>
                <span className="text-xl font-black text-[#7cb87c]">$1,080</span>
              </div>
            </div>

            {/* Other differences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-2 border-[#1a1a1a] p-6">
                <div className="font-black mb-2">Frame.io</div>
                <ul className="text-sm text-[#888] space-y-1">
                  <li>• Deep Adobe integration</li>
                  <li>• More enterprise features</li>
                  <li>• Larger ecosystem</li>
                </ul>
              </div>
              <div className="border-2 border-[#2d5a2d] p-6">
                <div className="font-black text-[#2d5a2d] mb-2">lawn</div>
                <ul className="text-sm space-y-1">
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
      <section className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black mb-12">How it works</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            {[
              { step: "1", action: "Upload", desc: "your video" },
              { step: "2", action: "Share", desc: "the link" },
              { step: "3", action: "Click", desc: "to comment" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-16 h-16 bg-[#2d5a2d] flex items-center justify-center text-3xl font-black">
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
      <section className="px-6 py-16 border-b-2 border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl sm:text-3xl font-bold leading-tight">
            "I built lawn because I got tired of waiting for Frame.io to load.
            Video review should be instant."
          </blockquote>
          <p className="mt-4 text-[#888]">— <a href="https://x.com/theo" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1a1a1a]">Theo</a></p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black">
            Try lawn free
          </h2>
          <p className="text-xl text-[#888] mt-4 mb-8">
            14 days. No credit card. See if it's right for you.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-[#2d5a2d] text-[#f0f0e8] px-12 py-5 text-xl font-black hover:bg-[#3a6a3a] transition-colors"
          >
            Start Free Trial
          </Link>
          <p className="mt-4 text-sm text-[#888]">$5/month after trial</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm">
          <span className="font-black text-xl">lawn</span>
          <div className="flex gap-6 text-[#888]">
            <Link href="/github" className="hover:text-[#1a1a1a]">GitHub</Link>
            <Link href="/docs" className="hover:text-[#1a1a1a]">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
