"use client";

import Link from "next/link";

// Design 10b: Protest Poster - Bold statement, clear product
// Big lawn brand, clear video review messaging, comparison as data

export default function Homepage10b() {
  return (
    <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a]">
      {/* Nav */}
      <nav className="px-6 py-4 flex justify-between items-center border-b-2 border-[#1a1a1a]">
        <span className="text-2xl font-black">lawn</span>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-[#888] hidden sm:inline">video review platform</span>
          <Link href="/sign-in" className="hover:underline">Sign In</Link>
          <Link href="/sign-up" className="bg-[#1a1a1a] text-[#f0f0e8] px-4 py-2 font-bold hover:bg-[#2d5a2d]">
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero - Product first, then differentiator */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {/* What it is - big and clear */}
          <div className="max-w-3xl">
            <div className="text-sm tracking-widest text-[#2d5a2d] font-bold mb-4">
              VIDEO COLLABORATION PLATFORM
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95]">
              Review videos together.
              <br />
              <span className="text-[#2d5a2d]">Comment on any frame.</span>
            </h1>
            <p className="text-xl text-[#666] mt-6 max-w-xl">
              lawn is a simple tool for creative teams to review video.
              Upload, share a link, click anywhere to leave feedback.
            </p>
          </div>

          {/* Price callout */}
          <div className="mt-12 flex flex-wrap items-end gap-8">
            <div className="bg-[#1a1a1a] text-[#f0f0e8] p-6">
              <div className="text-4xl sm:text-5xl font-black">$5<span className="text-xl">/mo</span></div>
              <div className="text-sm mt-1 opacity-70">unlimited seats</div>
            </div>
            <div>
              <Link
                href="/sign-up"
                className="inline-block border-4 border-[#1a1a1a] px-8 py-4 text-lg font-black hover:bg-[#1a1a1a] hover:text-[#f0f0e8] transition-colors"
              >
                Try Free for 14 Days →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The difference - not demands, just facts */}
      <section className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-12">
            Same features. Different philosophy.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* lawn side */}
            <div>
              <div className="text-sm tracking-widest text-[#7cb87c] mb-6">LAWN</div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-[#7cb87c] font-bold">✓</span>
                  <span><strong>$5/month flat.</strong> Add everyone—editors, clients, stakeholders. No extra cost.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#7cb87c] font-bold">✓</span>
                  <span><strong>Frame-accurate comments.</strong> Click the exact moment. No timestamps needed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#7cb87c] font-bold">✓</span>
                  <span><strong>Built for speed.</strong> 0.3s average response time. No waiting.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#7cb87c] font-bold">✓</span>
                  <span><strong>Works with any NLE.</strong> Premiere, Resolve, Final Cut, whatever you use.</span>
                </li>
              </ul>
            </div>

            {/* Comparison side */}
            <div>
              <div className="text-sm tracking-widest text-[#666] mb-6">TYPICAL VIDEO REVIEW TOOLS</div>
              <ul className="space-y-4 text-[#888]">
                <li className="flex items-start gap-3">
                  <span className="text-[#666]">•</span>
                  <span>$15-25/month per user. Team of 5 = $1,000+/year.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#666]">•</span>
                  <span>Frame-accurate comments (this is standard now).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#666]">•</span>
                  <span>Can feel slow with large files or complex projects.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#666]">•</span>
                  <span>Often tied to specific ecosystems (Adobe, etc).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="px-6 py-16 border-b-2 border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: "12k+", label: "videos reviewed" },
              { value: "0.3s", label: "avg response" },
              { value: "∞", label: "seats included" },
              { value: "$5", label: "per month" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl sm:text-5xl font-black">{stat.value}</div>
                <div className="text-sm text-[#888] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black mb-12">Three steps. That's it.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Upload", desc: "Drag your video file in. We handle the rest." },
              { num: "02", title: "Share", desc: "Send the link to anyone. No account required to view." },
              { num: "03", title: "Review", desc: "Click any frame to leave a comment. Done." },
            ].map((step, i) => (
              <div key={i}>
                <div className="text-5xl font-black text-[#ddd]">{step.num}</div>
                <div className="text-xl font-black mt-2">{step.title}</div>
                <div className="text-sm text-[#888] mt-1">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#2d5a2d] text-[#f0f0e8] px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-6xl font-black mb-6">
            Ready to simplify video review?
          </h2>
          <p className="text-xl opacity-80 mb-8">
            14-day free trial. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-[#f0f0e8] text-[#1a1a1a] px-12 py-5 text-xl font-black hover:bg-white transition-colors"
          >
            Start Free Trial
          </Link>
          <p className="mt-6 text-sm opacity-60">Then $5/month. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm">
          <span className="font-black text-xl">lawn</span>
          <div className="flex gap-6 text-[#888]">
            <Link href="/github" className="hover:text-[#f0f0e8]">GitHub</Link>
            <Link href="/docs" className="hover:text-[#f0f0e8]">Docs</Link>
            <Link href="/privacy" className="hover:text-[#f0f0e8]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
