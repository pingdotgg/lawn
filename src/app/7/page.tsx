"use client";

import Link from "next/link";

// Design 7: Newspaper/Editorial
// Black and white like a broadsheet, green only for highlights
// Frame.io as "breaking news"

export default function Homepage7() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
      {/* Masthead */}
      <header className="border-b-2 border-[#1a1a1a] px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center text-xs mb-4">
            <span>{today}</span>
            <div className="flex gap-4">
              <Link href="/sign-in" className="hover:underline">Sign In</Link>
              <Link href="/sign-up" className="font-bold hover:underline">Subscribe</Link>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-7xl sm:text-8xl font-serif font-black tracking-tight">
              lawn
            </h1>
            <p className="text-sm mt-2 tracking-[0.3em] uppercase">
              The Video Review Chronicle
            </p>
          </div>
        </div>
      </header>

      {/* Breaking news banner */}
      <div className="bg-[#1a1a1a] text-[#f5f5f0] py-2 px-4 text-center text-sm">
        <span className="text-[#7cb87c] font-bold mr-2">BREAKING:</span>
        Creators discover they've been overpaying for video review by 95%
      </div>

      {/* Main content - newspaper grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Lead story */}
        <article className="border-b-2 border-[#1a1a1a] pb-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-5xl sm:text-6xl font-serif font-bold leading-[1.1] mb-4">
                Frame.io Charges $228/Year Per Editor While Alternative Offers Unlimited Seats for $5/Month
              </h2>
              <p className="text-lg text-[#444] leading-relaxed mb-6">
                A new video collaboration tool built by a frustrated YouTuber promises to end the era of per-seat pricing in creative software. Industry analysts call it "the most significant pricing disruption since Google Docs."
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-bold">By The Editors</span>
                <span className="text-[#888]">|</span>
                <span className="text-[#888]">5 min read</span>
              </div>
            </div>
            <div className="bg-[#1a1a1a] text-[#f5f5f0] p-8 flex flex-col justify-between">
              <div>
                <div className="text-sm text-[#7cb87c] mb-2">PRICING COMPARISON</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold line-through opacity-50">$228</div>
                    <div className="text-xs opacity-60">Frame.io / year / editor</div>
                  </div>
                  <div>
                    <div className="text-5xl font-bold text-[#7cb87c]">$5</div>
                    <div className="text-xs opacity-60">lawn / month / unlimited</div>
                  </div>
                </div>
              </div>
              <Link
                href="/sign-up"
                className="mt-8 block text-center py-3 border border-[#f5f5f0] hover:bg-[#f5f5f0] hover:text-[#1a1a1a] transition-colors font-bold"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </article>

        {/* Secondary stories - 3 column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-[#ccc] pb-8 mb-8">
          {[
            {
              headline: "Frame-Accurate Comments Change Review Workflow",
              excerpt: "New technology allows collaborators to leave feedback on exact video frames, eliminating timestamp confusion.",
              category: "TECHNOLOGY",
            },
            {
              headline: "Small Studios Report 95% Cost Reduction",
              excerpt: "Independent production companies switching from legacy tools see immediate impact on bottom line.",
              category: "BUSINESS",
            },
            {
              headline: "'I Built It Because I Was Tired of Waiting'",
              excerpt: "Creator behind lawn speaks about frustrations with slow, expensive alternatives.",
              category: "INTERVIEW",
            },
          ].map((story, i) => (
            <article key={i}>
              <div className="text-xs text-[#7cb87c] font-bold mb-2">{story.category}</div>
              <h3 className="text-xl font-serif font-bold leading-tight mb-2">
                {story.headline}
              </h3>
              <p className="text-sm text-[#666] leading-relaxed">{story.excerpt}</p>
            </article>
          ))}
        </div>

        {/* Pull quote */}
        <blockquote className="border-l-4 border-[#7cb87c] pl-6 py-4 my-12">
          <p className="text-3xl font-serif italic leading-relaxed">
            "Per-seat pricing is a tax on collaboration. We're done with it."
          </p>
          <cite className="text-sm text-[#888] mt-4 block">— Lawn Founder</cite>
        </blockquote>

        {/* Feature comparison as data table */}
        <section className="mb-12">
          <h2 className="text-2xl font-serif font-bold mb-6 pb-2 border-b border-[#1a1a1a]">
            By The Numbers
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left py-3 font-bold">Metric</th>
                <th className="text-right py-3 font-bold">Frame.io</th>
                <th className="text-right py-3 font-bold text-[#7cb87c]">lawn</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Annual cost (5 users)", "$1,140", "$60"],
                ["Per-seat pricing", "Yes", "No"],
                ["Comment accuracy", "Timestamp", "Frame-exact"],
                ["Average latency", "~2s", "0.3s"],
                ["Vendor lock-in", "Adobe", "None"],
              ].map((row, i) => (
                <tr key={i} className="border-b border-[#ddd]">
                  <td className="py-3">{row[0]}</td>
                  <td className="text-right py-3 text-[#888]">{row[1]}</td>
                  <td className="text-right py-3 font-bold">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* CTA section styled as classified ad */}
        <section className="bg-[#1a1a1a] text-[#f5f5f0] p-8 mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-xs text-[#7cb87c] mb-4 tracking-widest">SPECIAL OFFER</div>
            <h2 className="text-4xl font-serif font-bold mb-4">
              Switch Today. Save Immediately.
            </h2>
            <p className="text-[#aaa] mb-8">
              Join thousands of creators who stopped overpaying for video review.
            </p>
            <Link
              href="/sign-up"
              className="inline-block bg-[#7cb87c] text-[#1a1a1a] px-10 py-4 font-bold hover:bg-[#a0d0a0] transition-colors"
            >
              Start Your Free Trial
            </Link>
            <p className="text-xs text-[#666] mt-4">$5/month after trial • Cancel anytime</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#888]">
          <span>© 2025 lawn</span>
          <div className="flex gap-6">
            <Link href="/github" className="hover:text-[#1a1a1a]">GitHub</Link>
            <Link href="/docs" className="hover:text-[#1a1a1a]">Documentation</Link>
            <Link href="/privacy" className="hover:text-[#1a1a1a]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
