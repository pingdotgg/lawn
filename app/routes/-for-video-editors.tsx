import { Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/MarketingLayout";

const painPoints = [
  {
    id: "01",
    title: "CLIENTS DON'T KNOW TIMECODES",
    description:
      'Your client says "around the middle somewhere, you know, after the thing." With lawn, they click on the video and their comment lands on that exact frame. No timecode math. No guessing.',
  },
  {
    id: "02",
    title: "UPLOAD, WAIT, TRANSCODE, WAIT",
    description:
      "You just exported a 12GB ProRes and now you need to wait 20 minutes for it to process. lawn uses Mux-powered playback — upload your file, get a link, share it. Seconds, not minutes.",
  },
  {
    id: "03",
    title: "GETTING NOTES BACK INTO YOUR NLE",
    description:
      "Comments are useless if you have to manually re-type them into your timeline. Export frame-accurate comments as DaVinci Resolve timeline markers, or grab a CSV.",
  },
  {
    id: "04",
    title: "10 REVIEWERS = 10 SEATS = $$$",
    description:
      "The director, the producer, the client, the client's wife, the intern who somehow has opinions — they all need access. lawn is $5/month flat. Invite literally everyone.",
  },
];

const steps = [
  {
    step: "1",
    action: "UPLOAD YOUR CUT",
    description:
      "Drag and drop your export. H.264, ProRes, whatever. We process it instantly through Mux so playback is fast on any device, any connection.",
  },
  {
    step: "2",
    action: "SHARE A LINK",
    description:
      "Copy the review link and send it to your client. They don't need an account, they don't need to download anything. They just click and watch.",
  },
  {
    step: "3",
    action: "COLLECT & EXPORT",
    description:
      "Clients click anywhere on the video to leave comments at exact frames. You see every note with precise timecodes, ready to drop back onto a DaVinci Resolve timeline.",
  },
];

export default function ForVideoEditors() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b-2 border-[#1a1a1a] bg-[var(--background)] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-sm font-bold tracking-widest text-[#888] uppercase">
            FOR VIDEO EDITORS
          </div>
          <h1 className="mb-8 text-5xl leading-[0.85] font-black tracking-tighter uppercase md:text-7xl lg:text-8xl">
            VIDEO REVIEW THAT EDITORS ACTUALLY WANT TO USE.
          </h1>
          <p className="mb-12 max-w-3xl text-xl font-medium text-[#888] md:text-2xl">
            Your client said "make it pop" on a 47-minute timeline. You deserve a review tool that
            at least tells you where they meant. lawn gives you frame-accurate feedback, instant
            playback, and a workflow that doesn't fight your NLE.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              to="/sign-up"
              className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-8 py-4 text-center text-lg font-black tracking-wider text-[#f0f0e8] uppercase shadow-[6px_6px_0px_0px_var(--shadow-color)] transition-colors hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#2d5a2d] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]"
            >
              START FREE TRIAL
            </Link>
            <div className="flex items-center gap-3 px-4">
              <span className="text-2xl font-black">$5/mo</span>
              <span className="text-sm font-bold tracking-wider text-[#888] uppercase">
                flat, not per seat
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#e8e8e0] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl leading-none font-black tracking-tighter uppercase md:text-6xl">
            THE PAIN IS REAL.
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg font-medium text-[#888]">
            Every editor knows these problems. We built lawn to fix them.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {painPoints.map((point) => (
              <div
                key={point.id}
                className="border-2 border-[#1a1a1a] bg-[#f0f0e8] shadow-[8px_8px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--shadow-color)]"
              >
                <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] px-6 py-4">
                  <span className="text-sm font-black text-[#888]">/{point.id}</span>
                  <span className="text-sm font-bold tracking-wider text-[#2d5a2d] uppercase">
                    SOLVED
                  </span>
                </div>
                <div className="p-6 md:p-8">
                  <h3 className="mb-4 text-xl leading-tight font-black tracking-tight uppercase md:text-2xl">
                    {point.title}
                  </h3>
                  <p className="text-base leading-relaxed font-medium text-[#1a1a1a]">
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works for Editors */}
      <section className="border-b-2 border-[#1a1a1a] bg-[var(--background)] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl leading-none font-black tracking-tighter uppercase md:text-6xl">
            HOW IT WORKS.
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg font-medium text-[#888]">
            Three steps. No onboarding calls, no training videos, no "schedule a demo" buttons.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex flex-col border-2 border-[#1a1a1a] bg-[#f0f0e8] shadow-[12px_12px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-2 hover:-translate-y-2 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]"
              >
                <div className="flex items-end justify-between border-b-2 border-[#1a1a1a] bg-[#1a1a1a] p-6 text-[#f0f0e8]">
                  <span className="text-7xl leading-none font-black">{item.step}</span>
                  <span className="mb-1 text-xl font-bold tracking-widest text-[#888]">STEP</span>
                </div>
                <div className="flex flex-grow flex-col p-8">
                  <h3 className="mb-4 text-2xl font-black tracking-tighter text-[#2d5a2d] uppercase md:text-3xl">
                    {item.action}
                  </h3>
                  <p className="text-base leading-relaxed font-medium text-[#1a1a1a]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#2d5a2d] px-6 py-24 text-[#f0f0e8] md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-8 text-6xl leading-[0.85] font-black tracking-tighter uppercase md:text-8xl lg:text-9xl">
            $5/MONTH.
            <br />
            <span className="text-[#7cb87c]">NOT PER USER.</span>
            <br />
            TOTAL.
          </h2>
          <p className="mx-auto mb-4 max-w-2xl text-xl font-medium text-[#f0f0e8]/80 md:text-2xl">
            Unlimited seats. Unlimited projects. Unlimited reviewers. Your entire team, your
            clients, your client's clients — everyone gets access for one flat price.
          </p>
          <p className="text-lg font-bold text-[#7cb87c]">
            Stop paying per-seat tax on collaboration.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--background)] px-6 py-32">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="mb-6 text-5xl leading-[0.85] font-black tracking-tighter uppercase md:text-7xl lg:text-8xl">
            START EDITING FASTER.
          </h2>
          <p className="mb-12 max-w-xl text-xl font-medium text-[#888]">
            Free trial, no credit card. Set up your first review in under a minute.
          </p>
          <Link
            to="/sign-up"
            className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-12 py-6 text-2xl font-black tracking-wider text-[#f0f0e8] uppercase shadow-[12px_12px_0px_0px_var(--shadow-accent)] transition-colors hover:translate-x-[2px] hover:translate-y-[2px] hover:border-[#2d5a2d] hover:bg-[#2d5a2d] hover:shadow-[8px_8px_0px_0px_var(--shadow-accent)]"
          >
            START FREE TRIAL
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
