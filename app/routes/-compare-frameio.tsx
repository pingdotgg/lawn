import { Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/MarketingLayout";

const FRAMEIO_PRICE_PER_USER = 19;
const LAWN_PRICE_FLAT = 5;

const comparisonRows = [
  {
    feature: "Price",
    frameio: "$19/user/month",
    lawn: "$5/month. Total.",
    note: "Math is hard, but not that hard.",
  },
  {
    feature: "Seats",
    frameio: "Limited by plan tier",
    lawn: "Unlimited",
    note: "Your intern deserves access too.",
  },
  {
    feature: "Speed",
    frameio: "It's... fine",
    lawn: "Actually fast",
    note: "We obsess over this so you don't wait.",
  },
  {
    feature: "Open source",
    frameio: "No",
    lawn: "Yes",
    note: "Read our code. Judge us.",
  },
  {
    feature: "Sharing",
    frameio: "Account required",
    lawn: "Just a link",
    note: "Your clients don't want another login.",
  },
  {
    feature: "Setup",
    frameio: "Call sales for enterprise",
    lawn: "Sign up and upload",
    note: "Under 60 seconds or your money back.",
  },
];

const teamSizes = [3, 5, 10, 20];

function annualSavings(teamSize: number) {
  return (FRAMEIO_PRICE_PER_USER * teamSize - LAWN_PRICE_FLAT) * 12;
}

const savingsCommentary: Record<number, string> = {
  3: "That's a lot of burritos.",
  5: "A nice weekend trip for the team.",
  10: "A used car. A really used car.",
  20: "You could hire another freelancer with that.",
};

export default function CompareFrameio() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="px-6 pt-20 pb-24 md:pt-28 md:pb-32 border-b-2 border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-[14vw] sm:text-[10vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase">
            lawn vs
            <br />
            Frame.io
          </h1>
          <div className="mt-10 md:mt-14 max-w-2xl">
            <p className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight">
              We're not better.
              <br />
              We're cheaper and faster.
              <br />
              <span className="text-[var(--foreground-muted)]">
                That might be better.
              </span>
            </p>
            <p className="mt-6 text-lg text-[var(--foreground-muted)] font-medium max-w-lg">
              Frame.io is a great product built for enterprise teams with
              enterprise budgets. lawn is a scrappy little tool that does the
              important stuff for $5/month flat. No per-seat math. No PhD in
              procurement required.
            </p>
          </div>
        </div>
      </section>

      {/* Side-by-side comparison table */}
      <section className="px-6 py-24 md:py-32 border-b-2 border-[var(--border)] bg-[var(--surface-alt)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-16 text-center">
            FEATURE
            <br />
            FIGHT.
          </h2>

          <div className="border-2 border-[var(--border)] shadow-[8px_8px_0px_0px_var(--shadow-color)] bg-[var(--background)]">
            {/* Header row */}
            <div className="grid grid-cols-3 border-b-2 border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground-inverse)]">
              <div className="p-4 md:p-6 font-black uppercase tracking-wider text-sm">
                Feature
              </div>
              <div className="p-4 md:p-6 font-black uppercase tracking-wider text-sm border-l-2 border-[var(--border)]">
                Frame.io
              </div>
              <div className="p-4 md:p-6 font-black uppercase tracking-wider text-sm border-l-2 border-[var(--border)] text-[var(--accent-light)]">
                lawn
              </div>
            </div>

            {/* Data rows */}
            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? "border-b-2 border-[var(--border)]" : ""}`}
              >
                <div className="p-4 md:p-6 flex flex-col justify-center">
                  <span className="font-black uppercase tracking-tight text-lg">
                    {row.feature}
                  </span>
                  <span className="text-xs text-[var(--foreground-muted)] mt-1 hidden md:block">
                    {row.note}
                  </span>
                </div>
                <div className="p-4 md:p-6 border-l-2 border-[var(--border)] flex items-center text-[var(--foreground-muted)] font-medium">
                  {row.frameio}
                </div>
                <div className="p-4 md:p-6 border-l-2 border-[var(--border)] flex items-center font-bold text-[var(--accent)]">
                  {row.lawn}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[var(--foreground-muted)] mt-6 md:hidden">
            * Frame.io pricing based on their Team plan at $19/user/month.
          </p>
        </div>
      </section>

      {/* Cost savings calculator */}
      <section className="px-6 py-24 md:py-32 border-b-2 border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4 text-center">
            DO THE
            <br />
            MATH.
          </h2>
          <p className="text-center text-lg text-[var(--foreground-muted)] font-medium mb-16 max-w-lg mx-auto">
            Frame.io charges $19 per user per month. lawn charges $5 per month.
            Not per user. Just $5. Here's what that means annually.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamSizes.map((size) => {
              const savings = annualSavings(size);
              const frameioAnnual = FRAMEIO_PRICE_PER_USER * size * 12;
              const lawnAnnual = LAWN_PRICE_FLAT * 12;

              return (
                <div
                  key={size}
                  className="border-2 border-[var(--border)] bg-[var(--background)] shadow-[6px_6px_0px_0px_var(--shadow-color)] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all flex flex-col"
                >
                  <div className="border-b-2 border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground-inverse)] p-5">
                    <span className="text-4xl font-black">{size}</span>
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)] ml-2">
                      {size === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        Frame.io
                      </span>
                      <span className="font-black text-[var(--foreground-muted)] line-through">
                        ${frameioAnnual.toLocaleString()}/yr
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                        lawn
                      </span>
                      <span className="font-black text-[var(--accent)]">
                        ${lawnAnnual}/yr
                      </span>
                    </div>
                    <div className="border-t-2 border-[var(--border-subtle)] pt-4 mt-auto">
                      <div className="text-3xl font-black text-[var(--accent)]">
                        ${savings.toLocaleString()}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        saved per year
                      </div>
                      <p className="text-sm text-[var(--foreground-muted)] mt-2 italic">
                        {savingsCommentary[size]}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Honest "who should use what" */}
      <section className="px-6 py-24 md:py-32 border-b-2 border-[var(--border)] bg-[var(--surface-alt)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4 text-center">
            HONEST
            <br />
            ADVICE.
          </h2>
          <p className="text-center text-lg text-[var(--foreground-muted)] font-medium mb-16 max-w-lg mx-auto">
            We could trash-talk Frame.io but that would be dishonest and also
            they have way more employees than us. Here's the real deal.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Use Frame.io if... */}
            <div className="border-2 border-[var(--border)] bg-[var(--background)] shadow-[8px_8px_0px_0px_var(--shadow-color)]">
              <div className="border-b-2 border-[var(--border)] p-6">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                  Use Frame.io if...
                </h3>
              </div>
              <div className="p-6">
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--foreground-muted)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You need enterprise compliance docs (SOC 2, etc.) for your
                      procurement team to approve anything
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--foreground-muted)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You're deeply embedded in Adobe Premiere and After Effects
                      and need native panel integration
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--foreground-muted)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You have 100+ people with complex multi-stage approval
                      workflows and version trees
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--foreground-muted)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      Budget isn't a concern and you want every feature
                      imaginable, even the ones you'll never use
                    </span>
                  </li>
                </ul>
                <p className="text-sm text-[var(--foreground-muted)] mt-6 pt-4 border-t-2 border-[var(--border-subtle)]">
                  Genuinely, Frame.io is solid software. If this is you, go use
                  it. We won't be offended. (Okay maybe a little.)
                </p>
              </div>
            </div>

            {/* Use lawn if... */}
            <div className="border-2 border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground-inverse)] shadow-[8px_8px_0px_0px_var(--shadow-accent)]">
              <div className="border-b-2 border-[var(--border)] p-6">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-[var(--accent-light)]">
                  Use lawn if...
                </h3>
              </div>
              <div className="p-6">
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-light)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You're a small-to-mid team that just needs to share cuts
                      and collect feedback without a NASA control panel
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-light)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You're an agency tired of doing per-seat multiplication
                      every time you onboard a client
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-light)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You're a freelancer who just needs to show a cut to a
                      client without making them create yet another account
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[var(--accent-light)] font-black text-lg shrink-0 mt-0.5">
                      --
                    </span>
                    <span className="font-medium">
                      You value speed and simplicity over a feature checklist
                      that makes the marketing site look impressive
                    </span>
                  </li>
                </ul>
                <p className="text-sm text-[var(--foreground-muted)] mt-6 pt-4 border-t border-[#333]">
                  We do less than Frame.io. Proudly. Turns out "upload, share,
                  comment" is 90% of what anyone actually needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-4">
            START
            <br />
            NOW.
          </h2>
          <p className="text-xl md:text-2xl text-[var(--foreground-muted)] font-medium mb-12 max-w-md">
            $5/month. Unlimited seats. No sales call required. No credit card to
            start.
          </p>
          <Link
            to="/sign-up"
            className="bg-[var(--surface-strong)] text-[var(--foreground-inverse)] px-12 py-6 border-2 border-[var(--border)] text-2xl font-black uppercase tracking-wider hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors shadow-[12px_12px_0px_0px_var(--shadow-accent)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[8px_8px_0px_0px_var(--shadow-accent)]"
          >
            TRY LAWN FREE
          </Link>
          <p className="text-sm text-[var(--foreground-muted)] mt-6">
            Or keep paying $19/user/month. We don't judge.
            <br />
            (We judge a little.)
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
