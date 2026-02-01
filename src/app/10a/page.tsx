"use client";

import Link from "next/link";

// Design 10a: Protest Poster - Lawn as hero
// Lead with lawn, explain what it is, then the comparison

export default function Homepage10a() {
  return (
    <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a]">
      {/* Top strip */}
      <div className="bg-[#1a1a1a] text-[#f0f0e8] py-2 px-6 flex justify-between items-center text-xs">
        <span className="font-bold tracking-wider">LAWN — VIDEO REVIEW FOR TEAMS</span>
        <div className="flex gap-4">
          <Link href="/sign-in" className="hover:underline">Sign In</Link>
          <Link href="/sign-up" className="font-bold hover:underline">Start Free</Link>
        </div>
      </div>

      {/* Hero - Lawn first */}
      <section className="px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          {/* Brand + what it is */}
          <div className="mb-8">
            <h1 className="text-8xl sm:text-9xl font-black tracking-tight">lawn</h1>
            <p className="text-xl sm:text-2xl mt-4 max-w-xl">
              Video collaboration and review.
              <span className="text-[#2d5a2d] font-bold"> Click any frame to comment.</span>
            </p>
          </div>

          {/* The pitch */}
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div>
              <p className="text-4xl sm:text-5xl font-black leading-tight">
                Built by a creator
                <br />
                who got tired of
                <br />
                <span className="text-[#1a1a1a]/40">slow, expensive tools.</span>
              </p>
            </div>

            <div className="bg-[#2d5a2d] text-[#f0f0e8] p-8">
              <div className="text-sm tracking-widest mb-2">SIMPLE PRICING</div>
              <div className="text-6xl sm:text-7xl font-black">$5</div>
              <div className="text-xl mt-1">/month</div>
              <div className="text-sm mt-4 opacity-80">Unlimited team members. No per-seat fees.</div>
              <Link
                href="/sign-up"
                className="inline-block mt-6 bg-[#f0f0e8] text-[#1a1a1a] px-6 py-3 font-bold hover:bg-white transition-colors"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What you get - not demands */}
      <section className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-sm tracking-widest text-[#7cb87c] mb-8">WHAT YOU GET</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Frame-accurate comments", desc: "Click the exact frame. No more 'around 2:34 somewhere'." },
              { title: "Unlimited collaborators", desc: "Add your whole team, clients, everyone. One price." },
              { title: "Fast. Actually fast.", desc: "0.3 second average response. We measured." },
              { title: "Works with everything", desc: "Premiere, Resolve, Final Cut, whatever. No lock-in." },
            ].map((item, i) => (
              <div key={i} className="border-l-2 border-[#333] pl-4">
                <div className="font-bold mb-2">{item.title}</div>
                <div className="text-sm text-[#888]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fair comparison */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm tracking-widest text-[#1a1a1a]/50 mb-8">HONEST COMPARISON</div>

          <div className="border-2 border-[#1a1a1a]">
            <div className="grid grid-cols-3 border-b-2 border-[#1a1a1a] font-bold">
              <div className="p-4"></div>
              <div className="p-4 text-center border-l-2 border-[#1a1a1a]">Frame.io</div>
              <div className="p-4 text-center border-l-2 border-[#1a1a1a] bg-[#2d5a2d] text-[#f0f0e8]">lawn</div>
            </div>
            {[
              ["Price (annual)", "$228/editor", "$60 total"],
              ["Team of 5", "$1,140/year", "$60/year"],
              ["Per-seat pricing", "Yes", "No"],
              ["Frame-accurate", "Yes", "Yes"],
              ["Adobe integration", "Deep", "None needed"],
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-b border-[#1a1a1a] last:border-b-0">
                <div className="p-4 text-sm">{row[0]}</div>
                <div className="p-4 text-center border-l-2 border-[#1a1a1a] text-[#888]">{row[1]}</div>
                <div className="p-4 text-center border-l-2 border-[#1a1a1a] font-bold">{row[2]}</div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-[#888]">
            Frame.io is great software. We just think video review shouldn't cost $228/year per person.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm tracking-widest text-[#7cb87c] mb-8">HOW IT WORKS</div>

          <div className="flex flex-col sm:flex-row justify-between gap-8">
            {[
              { num: "1", text: "Upload your video" },
              { num: "2", text: "Share the link" },
              { num: "3", text: "Click any frame to comment" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-6xl font-black text-[#333]">{step.num}</span>
                <span className="text-xl font-bold">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl sm:text-7xl font-black mb-6">
            Try lawn free
          </h2>
          <p className="text-xl text-[#666] mb-8">
            See why teams are switching to simpler video review.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-[#1a1a1a] text-[#f0f0e8] px-12 py-5 text-xl font-bold hover:bg-[#2d5a2d] transition-colors"
          >
            Start Free Trial
          </Link>
          <p className="mt-4 text-sm text-[#888]">$5/month after trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm">
          <span className="font-black text-xl">lawn</span>
          <div className="flex gap-6 text-[#888]">
            <Link href="/github" className="hover:text-[#1a1a1a]">GitHub</Link>
            <Link href="/docs" className="hover:text-[#1a1a1a]">Docs</Link>
            <Link href="/privacy" className="hover:text-[#1a1a1a]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
