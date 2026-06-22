import { useState, useEffect } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { MarketingFooter } from "@/components/MarketingFooter";
import { dashboardHomePath } from "@/lib/routes";

function HomeNavActions({ scrolled }: { scrolled: boolean }) {
  const { isLoaded, userId } = useAuth();
  const startClassName = `inline-flex min-w-[76px] justify-center px-4 py-2 border-2 transition-colors ${scrolled ? "border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f0f0e8]" : "border-[#f0f0e8] hover:bg-[#f0f0e8] hover:text-[#1a1a1a]"}`;

  if (!isLoaded) {
    return (
      <span className={`${startClassName} invisible`} aria-hidden="true">
        Log in
      </span>
    );
  }

  return userId ? (
    <Link to={dashboardHomePath()} className={startClassName}>
      Start
    </Link>
  ) : (
    <Link to="/sign-in" className={startClassName}>
      Log in
    </Link>
  );
}

export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Force light mode variables for the homepage to override the global app.css dark mode behavior
  const lightModeVars = {
    "--background": "#f0f0e8",
    "--background-alt": "#1a1a1a",
    "--surface": "#ffffff",
    "--surface-alt": "#e8e8e0",
    "--surface-strong": "#1a1a1a",
    "--surface-muted": "#d8d8d0",
    "--foreground": "#1a1a1a",
    "--foreground-muted": "#888888",
    "--foreground-subtle": "#aaaaaa",
    "--foreground-inverse": "#f0f0e8",
    "--border": "#1a1a1a",
    "--border-subtle": "#cccccc",
    "--accent": "#2d5a2d",
    "--accent-hover": "#3a6a3a",
    "--accent-light": "#7cb87c",
    "--shadow-color": "#1a1a1a",
    "--shadow-accent": "rgba(45,90,45,1)",
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen font-mono selection:bg-[#2d5a2d] selection:text-[#f0f0e8]"
      style={{ ...lightModeVars, backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Minimal nav */}
      <nav
        className={`fixed top-0 z-50 flex w-full items-center justify-between px-6 py-4 transition-all duration-200 ${scrolled ? "border-b-2 border-[#1a1a1a] bg-[#f0f0e8] text-[#1a1a1a]" : "bg-transparent text-[#f0f0e8] drop-shadow-md"}`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`text-xl font-black tracking-tighter transition-opacity duration-200 ${scrolled ? "opacity-100" : "opacity-0"}`}
          >
            lawn.
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm font-bold tracking-wide uppercase">
          <a href="#pricing" className="underline-offset-4 hover:underline">
            Pricing
          </a>
          <Link
            to="/compare/frameio"
            className={`hidden underline-offset-4 hover:underline sm:block`}
          >
            Compare
          </Link>
          <HomeNavActions scrolled={scrolled} />
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative flex min-h-[85vh] flex-col justify-end overflow-x-clip border-b-2 border-[#1a1a1a] bg-cover bg-center bg-no-repeat px-6 pt-32 pb-32 text-[#f0f0e8] md:pb-24"
        style={{ backgroundImage: `url('/grassy-bg.avif')` }}
      >
        {/* Lighter tint since text is now in highly contrasting blocks or heavily shadowed */}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          {/* Massive Title with Brutalist Depth */}
          <h1
            className="ml-[-0.5vw] text-[25vw] leading-[0.75] font-black tracking-tighter sm:text-[22vw]"
            style={{
              textShadow: "8px 8px 0 #1a1a1a, 0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            lawn
          </h1>

          <div className="mt-20 flex flex-col gap-12 md:mt-24 lg:flex-row lg:items-end lg:justify-between">
            {/* Highly Creative Contrast Subheadline Blocks (Stickers) */}
            <div className="flex max-w-full flex-col items-start gap-4 md:gap-6">
              <div className="max-w-full origin-bottom-left -rotate-2 border-2 border-[#1a1a1a] bg-[#f0f0e8] px-5 py-3 text-[#1a1a1a] shadow-[6px_6px_0px_0px_var(--shadow-color)] md:px-8 md:py-4 md:shadow-[8px_8px_0px_0px_var(--shadow-color)]">
                <p className="text-2xl leading-tight font-black tracking-tight uppercase sm:text-3xl md:text-4xl md:leading-none">
                  Video review for creative teams.
                </p>
              </div>
              <div className="ml-2 max-w-full origin-top-left rotate-1 border-2 border-[#1a1a1a] bg-[#2d5a2d] px-5 py-3 text-[#f0f0e8] shadow-[6px_6px_0px_0px_var(--shadow-color)] md:ml-8 md:px-8 md:py-4 md:shadow-[8px_8px_0px_0px_var(--shadow-color)]">
                <p className="text-xl leading-tight font-black tracking-tight uppercase sm:text-2xl md:text-3xl md:leading-none">
                  Less features. No bull$#!t.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-6 pb-2 sm:flex-row lg:mt-0 lg:justify-end">
              <div className="self-start border-2 border-[#1a1a1a] bg-[#f0f0e8] px-6 py-4 text-[#1a1a1a] shadow-[6px_6px_0px_0px_var(--shadow-color)] sm:self-auto md:px-8 md:py-5 md:shadow-[8px_8px_0px_0px_var(--shadow-color)]">
                <span className="block text-3xl leading-none font-black md:text-4xl">$5/mo</span>
                <span className="mt-1 block text-xs font-bold tracking-wider text-[#888] uppercase md:mt-2 md:text-sm">
                  Unlimited seats
                </span>
              </div>
              <Link
                to="/sign-up"
                className="flex items-center justify-center self-start border-2 border-[#1a1a1a] bg-[#1a1a1a] px-6 py-4 text-lg font-black text-[#f0f0e8] shadow-[6px_6px_0px_0px_var(--shadow-color)] transition-colors hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#2d5a2d] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] sm:self-auto md:px-8 md:py-5 md:text-xl md:shadow-[8px_8px_0px_0px_var(--shadow-color)] md:hover:shadow-[6px_6px_0px_0px_var(--shadow-color)]"
              >
                START FREE TRIAL →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brutalist Value Props Bar */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#f0f0e8]">
        <div className="grid grid-cols-1 divide-y-2 divide-[#1a1a1a] md:grid-cols-2 md:divide-x-2 md:divide-y-0 xl:grid-cols-4">
          {[
            {
              id: "01",
              title: "OPEN SOURCE",
              desc: "Fully open source. Read the code, fork it, make it yours.",
            },
            {
              id: "02",
              title: "ACTUALLY FAST",
              desc: "Instant playback. Built for speed, not loading spinners.",
            },
            {
              id: "03",
              title: "FLAT PRICING",
              desc: "$5 covers the whole agency. Stop counting seats.",
            },
            {
              id: "04",
              title: "SIMPLE SHARING",
              desc: "Just copy the link and send it to your client.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="group flex flex-col p-8 transition-colors hover:bg-[#1a1a1a] hover:text-[#f0f0e8] lg:p-12"
            >
              <div className="mb-8 text-sm font-black text-[#888] group-hover:text-[#7cb87c]">
                /{item.id}
              </div>
              <h3 className="mb-4 text-3xl leading-none font-black tracking-tighter uppercase lg:text-4xl">
                {item.title}
              </h3>
              <p className="mt-auto text-lg font-medium opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - Completely Rethought */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#e8e8e0] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-16 text-center text-5xl leading-none font-black tracking-tighter uppercase md:text-7xl">
            HOW IT WORKS.
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
            {[
              {
                step: "1",
                action: "UPLOAD",
                desc: "Drag and drop your cut. We process it instantly.",
              },
              { step: "2", action: "SHARE", desc: "Send a link. No account required for clients." },
              {
                step: "3",
                action: "REVIEW",
                desc: "Click to comment on exact frames. Export to your NLE.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col border-2 border-[#1a1a1a] bg-[#f0f0e8] shadow-[12px_12px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-2 hover:-translate-y-2 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]"
              >
                <div className="flex items-end justify-between border-b-2 border-[#1a1a1a] bg-[#1a1a1a] p-6 text-[#f0f0e8]">
                  <span className="text-7xl leading-none font-black">{item.step}</span>
                  <span className="mb-1 text-xl font-bold tracking-widest text-[#888]">STEP</span>
                </div>
                <div className="flex flex-grow flex-col p-8">
                  <h3 className="mb-4 text-3xl font-black tracking-tighter text-[#2d5a2d] uppercase md:text-4xl">
                    {item.action}
                  </h3>
                  <p className="text-lg font-medium text-[#1a1a1a]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#f0f0e8] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-16 lg:flex-row">
            <div className="lg:w-1/3">
              <h2 className="mb-6 text-5xl leading-none font-black tracking-tighter uppercase md:text-7xl">
                THE
                <br />
                RIVAL.
              </h2>
              <p className="max-w-sm text-xl font-medium text-[#888]">
                Frame.io is solid software. But you're paying for enterprise features you don't
                need.
              </p>
            </div>

            <div className="lg:w-2/3">
              <div className="grid grid-cols-1 border-2 border-[#1a1a1a] shadow-[12px_12px_0px_0px_var(--shadow-color)] md:grid-cols-2">
                {/* Competitor */}
                <div className="border-b-2 border-[#1a1a1a] bg-[#ffffff] p-8 md:border-r-2 md:border-b-0 md:p-12">
                  <div className="mb-2 text-sm font-bold tracking-widest text-[#888]">
                    THE OTHER GUYS
                  </div>
                  <div className="mb-8 text-5xl font-black tracking-tighter">Frame.io</div>

                  <div className="mb-8">
                    <div className="text-3xl font-black">$19</div>
                    <div className="text-sm font-bold tracking-wider text-[#888] uppercase">
                      Per user / month
                    </div>
                  </div>

                  <ul className="space-y-4 text-lg font-medium text-[#1a1a1a]">
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#dc2626]">×</span>
                      Complex interface
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#dc2626]">×</span>
                      Punishes you for growing
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#dc2626]">×</span>
                      Bloated ecosystem
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#dc2626]">×</span>
                      Closed source
                    </li>
                  </ul>
                </div>

                {/* Us */}
                <div className="bg-[#1a1a1a] p-8 text-[#f0f0e8] md:p-12">
                  <div className="mb-2 text-sm font-bold tracking-widest text-[#7cb87c]">
                    THE SOLUTION
                  </div>
                  <div className="mb-8 text-5xl font-black tracking-tighter text-[#7cb87c]">
                    lawn
                  </div>

                  <div className="mb-8">
                    <div className="text-3xl font-black text-[#7cb87c]">$5</div>
                    <div className="text-sm font-bold tracking-wider text-[#888] uppercase">
                      Flat total / month
                    </div>
                  </div>

                  <ul className="space-y-4 text-lg font-medium">
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#7cb87c]">✓</span>
                      Stupidly fast
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#7cb87c]">✓</span>
                      Invite the whole team
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#7cb87c]">✓</span>
                      Just what you need
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-black text-[#7cb87c]">✓</span>
                      Fully open source
                    </li>
                  </ul>

                  <div className="mt-12 border-t border-[#333] pt-6">
                    <span className="mb-1 block text-sm font-bold tracking-wider text-[#888] uppercase">
                      Yearly savings (5 users)
                    </span>
                    <span className="text-4xl font-black text-[#7cb87c]">$1,080</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#2d5a2d] px-6 py-32 text-[#f0f0e8]">
        <div className="mx-auto max-w-5xl text-center">
          <blockquote className="mb-8 text-4xl leading-tight font-black tracking-tighter uppercase md:text-6xl">
            "I built lawn because I got tired of waiting for Frame.io to load. Video review should
            be instant."
          </blockquote>
          <a
            href="https://x.com/theo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border-2 border-[#f0f0e8] px-6 py-3 font-bold tracking-wider uppercase transition-colors hover:bg-[#f0f0e8] hover:text-[#2d5a2d]"
          >
            — Theo
          </a>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="border-b-2 border-[#1a1a1a] bg-[#e8e8e0] px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-5xl leading-none font-black tracking-tighter uppercase md:text-7xl">
            PRICING.
          </h2>

          <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
            {/* $5 Plan */}
            <div className="flex w-full max-w-md flex-col border-2 border-[#1a1a1a] bg-[#f0f0e8] p-8 shadow-[8px_8px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-2 hover:-translate-y-2 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)]">
              <div className="mb-2 text-xl font-bold tracking-widest text-[#888] uppercase">
                Basic
              </div>
              <div className="mb-4 text-6xl font-black tracking-tighter">
                $5<span className="text-2xl text-[#888]">/mo</span>
              </div>
              <p className="mb-8 text-lg font-medium text-[#1a1a1a]">
                Unlimited everything, except storage.
              </p>

              <ul className="mb-8 flex-grow space-y-4 text-lg font-bold">
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#2d5a2d]">✓</span> Unlimited seats
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#2d5a2d]">✓</span> Unlimited projects
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#2d5a2d]">✓</span> Unlimited clients
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#2d5a2d]">✓</span> 100GB Storage
                </li>
              </ul>

              <Link
                to="/sign-up"
                className="border-2 border-[#1a1a1a] bg-[#1a1a1a] py-4 text-center font-black text-[#f0f0e8] uppercase transition-colors hover:bg-[#2d5a2d]"
              >
                Get Basic
              </Link>
            </div>

            {/* $25 Plan */}
            <div className="flex w-full max-w-md transform flex-col border-2 border-[#1a1a1a] bg-[#1a1a1a] p-8 text-[#f0f0e8] shadow-[8px_8px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-2 hover:-translate-y-6 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] md:-translate-y-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="text-xl font-bold tracking-widest text-[#7cb87c] uppercase">
                  Pro
                </div>
                <div className="-rotate-3 bg-[#2d5a2d] px-2 py-1 text-xs font-black tracking-wider uppercase">
                  Big files
                </div>
              </div>
              <div className="mb-4 text-6xl font-black tracking-tighter">
                $25<span className="text-2xl text-[#888]">/mo</span>
              </div>
              <p className="mb-8 text-lg font-medium">
                Literally the exact same thing but more space.
              </p>

              <ul className="mb-8 flex-grow space-y-4 text-lg font-bold">
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#7cb87c]">✓</span> Unlimited seats
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#7cb87c]">✓</span> Unlimited projects
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#7cb87c]">✓</span> Unlimited clients
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl text-[#7cb87c]">✓</span> 1TB Storage (Whoa)
                </li>
              </ul>

              <Link
                to="/sign-up"
                className="border-2 border-[#f0f0e8] bg-[#f0f0e8] py-4 text-center font-black text-[#1a1a1a] uppercase transition-colors hover:bg-[#d8d8d0]"
              >
                Get Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Massive CTA */}
      <section className="bg-[#f0f0e8] px-6 py-32">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="mb-8 text-7xl leading-[0.8] font-black tracking-tighter uppercase md:text-9xl">
            START
            <br />
            NOW.
          </h2>
          <p className="mb-12 text-2xl font-medium text-[#888]">
            Basic is $5/month. Pro is $25/month.
          </p>
          <Link
            to="/sign-up"
            className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-12 py-6 text-2xl font-black tracking-wider text-[#f0f0e8] uppercase shadow-[12px_12px_0px_0px_var(--shadow-accent)] transition-colors hover:translate-x-[2px] hover:translate-y-[2px] hover:border-[#2d5a2d] hover:bg-[#2d5a2d] hover:shadow-[8px_8px_0px_0px_var(--shadow-accent)]"
          >
            CREATE YOUR TEAM
          </Link>
        </div>
      </section>

      <MarketingFooter />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "lawn",
            description:
              "Video review and collaboration for creative teams. Frame-accurate comments, unlimited seats, flat pricing.",
            url: "https://lawn.video",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            offers: [
              {
                "@type": "Offer",
                name: "Basic",
                price: "5.00",
                priceCurrency: "USD",
                description:
                  "Unlimited seats, unlimited projects, unlimited clients, 100GB storage",
              },
              {
                "@type": "Offer",
                name: "Pro",
                price: "25.00",
                priceCurrency: "USD",
                description: "Unlimited seats, unlimited projects, unlimited clients, 1TB storage",
              },
            ],
            creator: {
              "@type": "Person",
              name: "Theo",
              url: "https://x.com/theo",
            },
          }),
        }}
      />
    </div>
  );
}
