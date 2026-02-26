import { Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/MarketingLayout";

export default function PricingPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-6 pt-24 pb-16 md:pt-32 md:pb-24 bg-[#f0f0e8] border-b-2 border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85]">
            PRICING.
          </h1>
          <p className="text-2xl md:text-3xl font-bold mt-8 max-w-2xl">
            $5/month. Not per user. Not per project.{" "}
            <span className="text-[#888]">Total.</span>
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 py-24 md:py-32 bg-[#e8e8e0] border-b-2 border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
            {/* Basic */}
            <div className="bg-[#f0f0e8] border-2 border-[#1a1a1a] shadow-[8px_8px_0px_0px_#1a1a1a] p-8 w-full max-w-md flex flex-col hover:-translate-y-2 hover:translate-x-2 hover:shadow-[4px_4px_0px_0px_#1a1a1a] transition-all">
              <div className="text-xl font-bold uppercase tracking-widest text-[#888] mb-2">
                Basic
              </div>
              <div className="text-6xl font-black tracking-tighter mb-4">
                $5<span className="text-2xl text-[#888]">/mo</span>
              </div>
              <p className="text-lg font-medium text-[#1a1a1a] mb-8">
                Unlimited everything, except storage.
              </p>

              <ul className="space-y-4 text-lg font-bold flex-grow mb-8">
                <li className="flex items-center gap-3">
                  <span className="text-[#2d5a2d] text-2xl">&#10003;</span>{" "}
                  Unlimited seats
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2d5a2d] text-2xl">&#10003;</span>{" "}
                  Unlimited projects
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2d5a2d] text-2xl">&#10003;</span>{" "}
                  Unlimited clients
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#2d5a2d] text-2xl">&#10003;</span>{" "}
                  100GB Storage
                </li>
              </ul>

              <Link
                to="/sign-up"
                className="bg-[#1a1a1a] text-[#f0f0e8] text-center py-4 border-2 border-[#1a1a1a] font-black uppercase hover:bg-[#2d5a2d] transition-colors"
              >
                Get Basic
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[#1a1a1a] text-[#f0f0e8] border-2 border-[#1a1a1a] shadow-[8px_8px_0px_0px_#1a1a1a] p-8 w-full max-w-md flex flex-col transform md:-translate-y-4 hover:-translate-y-6 hover:translate-x-2 hover:shadow-[4px_4px_0px_0px_#1a1a1a] transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xl font-bold uppercase tracking-widest text-[#7cb87c]">
                  Pro
                </div>
                <div className="bg-[#2d5a2d] text-xs font-black px-2 py-1 uppercase tracking-wider -rotate-3">
                  Big files
                </div>
              </div>
              <div className="text-6xl font-black tracking-tighter mb-4">
                $25<span className="text-2xl text-[#888]">/mo</span>
              </div>
              <p className="text-lg font-medium mb-8">
                Literally the exact same thing but more space.
              </p>

              <ul className="space-y-4 text-lg font-bold flex-grow mb-8">
                <li className="flex items-center gap-3">
                  <span className="text-[#7cb87c] text-2xl">&#10003;</span>{" "}
                  Unlimited seats
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#7cb87c] text-2xl">&#10003;</span>{" "}
                  Unlimited projects
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#7cb87c] text-2xl">&#10003;</span>{" "}
                  Unlimited clients
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-[#7cb87c] text-2xl">&#10003;</span> 1TB
                  Storage
                </li>
              </ul>

              <Link
                to="/sign-up"
                className="bg-[#f0f0e8] text-[#1a1a1a] text-center py-4 border-2 border-[#f0f0e8] font-black uppercase hover:bg-[#d8d8d0] transition-colors"
              >
                Get Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24 md:py-32 bg-[#f0f0e8] border-b-2 border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-16">
            FAQ.
          </h2>

          <div className="divide-y-2 divide-[#1a1a1a] border-y-2 border-[#1a1a1a]">
            {[
              {
                q: "What counts as a seat?",
                a: "Anyone on your team. Invite everyone — editors, producers, clients. No extra charge.",
              },
              {
                q: "Can clients review without an account?",
                a: "Yes. Send a share link. They click, watch, and comment. No sign-up required.",
              },
              {
                q: "What happens if I hit the storage limit?",
                a: "Upgrade to Pro for more space, or delete old projects to free up room.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes. Sign up and try it. No credit card required to start.",
              },
              {
                q: "Is lawn really open source?",
                a: "Fully. Check our GitHub. Read the code, fork it, whatever you want.",
              },
            ].map((item, i) => (
              <div key={i} className="py-8">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-3">
                  {item.q}
                </h3>
                <p className="text-lg font-medium text-[#888]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 bg-[#1a1a1a] text-[#f0f0e8]">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
            Still reading?
          </h2>
          <p className="text-xl text-[#888] font-medium mb-12">
            Just try it. No credit card. No commitment.
          </p>
          <Link
            to="/sign-up"
            className="bg-[#f0f0e8] text-[#1a1a1a] px-12 py-6 border-2 border-[#f0f0e8] text-2xl font-black uppercase tracking-wider hover:bg-[#2d5a2d] hover:text-[#f0f0e8] hover:border-[#2d5a2d] transition-colors shadow-[8px_8px_0px_0px_rgba(45,90,45,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0px_0px_rgba(45,90,45,1)]"
          >
            START FREE TRIAL
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
