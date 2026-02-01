"use client";

import Link from "next/link";

// Design 10d: Protest Poster - Split personality
// Strong lawn identity top, fair comparison middle, clear CTA

export default function Homepage10d() {
  return (
    <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a]">
      {/* Hero - Full width lawn statement */}
      <section className="bg-[#1a1a1a] text-[#f0f0e8]">
        {/* Nav inside hero */}
        <nav className="px-6 py-4 flex justify-between items-center border-b border-[#333]">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black">lawn</span>
            <span className="w-1 h-1 bg-[#7cb87c] rounded-full"></span>
            <span className="text-xs text-[#888]">video review platform</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/sign-in" className="text-[#888] hover:text-[#f0f0e8]">Sign In</Link>
            <Link href="/sign-up" className="text-[#7cb87c] font-bold">Start Free →</Link>
          </div>
        </nav>

        <div className="px-6 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9]">
                  Video review
                  <br />
                  <span className="text-[#7cb87c]">made simple</span>
                </h1>
                <p className="text-xl text-[#888] mt-6 max-w-md">
                  Upload videos. Share links. Click any frame to comment.
                  That's it.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/sign-up"
                    className="bg-[#7cb87c] text-[#1a1a1a] px-8 py-4 font-black hover:bg-[#a0d0a0] transition-colors"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/docs"
                    className="border border-[#444] px-8 py-4 font-bold hover:border-[#888] transition-colors"
                  >
                    See How It Works
                  </Link>
                </div>
              </div>

              {/* Price card */}
              <div className="bg-[#252525] p-8 border border-[#333]">
                <div className="text-sm text-[#7cb87c] tracking-widest mb-4">SIMPLE PRICING</div>
                <div className="text-6xl font-black">$5</div>
                <div className="text-xl text-[#888]">/month</div>
                <div className="mt-6 pt-6 border-t border-[#333] space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Team members</span>
                    <span className="font-bold">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Projects</span>
                    <span className="font-bold">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Per-seat fees</span>
                    <span className="font-bold text-[#7cb87c]">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get - clear features */}
      <section className="px-6 py-16 border-b-2 border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Frame-accurate feedback",
                desc: "Click any moment in your video to leave a comment. No timestamps, no confusion.",
              },
              {
                title: "Instant sharing",
                desc: "Generate a link, send it to anyone. They don't need an account to view and comment.",
              },
              {
                title: "Lightning fast",
                desc: "Built because other tools felt slow. 0.3 second average response time.",
              },
              {
                title: "No lock-in",
                desc: "Works alongside Premiere, Resolve, Final Cut, or whatever you edit with.",
              },
            ].map((feature, i) => (
              <div key={i}>
                <h3 className="font-black mb-2">{feature.title}</h3>
                <p className="text-sm text-[#888]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison - respectful but clear */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black mb-2">lawn vs. traditional tools</h2>
          <p className="text-[#888] mb-8">We respect Frame.io—it's great software. Here's why some teams choose lawn instead.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#1a1a1a]">
                  <th className="text-left py-4 pr-8"></th>
                  <th className="text-left py-4 px-4">Frame.io</th>
                  <th className="text-left py-4 px-4 bg-[#2d5a2d] text-[#f0f0e8]">lawn</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Price", frameio: "$19/user/mo", lawn: "$5/mo total" },
                  { feature: "Team of 5 (annual)", frameio: "$1,140", lawn: "$60" },
                  { feature: "Frame-accurate comments", frameio: "Yes", lawn: "Yes" },
                  { feature: "Per-seat pricing", frameio: "Yes", lawn: "No" },
                  { feature: "Adobe integration", frameio: "Deep integration", lawn: "Export-based" },
                  { feature: "Best for", frameio: "Enterprise teams", lawn: "Small-medium teams" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#ddd]">
                    <td className="py-4 pr-8 font-medium">{row.feature}</td>
                    <td className="py-4 px-4 text-[#888]">{row.frameio}</td>
                    <td className="py-4 px-4 font-bold">{row.lawn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#1a1a1a] text-[#f0f0e8] px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black mb-8">Get started in 60 seconds</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { num: "1", title: "Upload", desc: "Drag your video into lawn" },
              { num: "2", title: "Share", desc: "Copy the link, send it out" },
              { num: "3", title: "Review", desc: "Click any frame, type feedback" },
            ].map((step, i) => (
              <div key={i} className="bg-[#252525] p-6 border border-[#333]">
                <span className="text-4xl font-black text-[#333]">{step.num}</span>
                <h3 className="text-xl font-black mt-4">{step.title}</h3>
                <p className="text-sm text-[#888] mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-[#1a1a1a] text-[#f0f0e8] px-4 py-1 text-sm font-bold mb-6">
            NO CREDIT CARD REQUIRED
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            Try lawn for 14 days
          </h2>
          <p className="text-xl text-[#888] mb-8">
            See if it fits your workflow. No commitment.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-[#2d5a2d] text-[#f0f0e8] px-12 py-5 text-xl font-black hover:bg-[#3a6a3a] transition-colors"
          >
            Start Free Trial
          </Link>
          <p className="mt-4 text-sm text-[#888]">
            $5/month after trial • Unlimited seats • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black">lawn</span>
            <span className="text-xs text-[#888]">video review platform</span>
          </div>
          <div className="flex gap-6 text-sm text-[#888]">
            <Link href="/github" className="hover:text-[#1a1a1a]">GitHub</Link>
            <Link href="/docs" className="hover:text-[#1a1a1a]">Docs</Link>
            <Link href="/privacy" className="hover:text-[#1a1a1a]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
