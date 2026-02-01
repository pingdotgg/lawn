"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Design 2: Terminal/Hacker Aesthetic
// Developer-focused, command-line inspired, ASCII elements

const COMMANDS = [
  { cmd: "lawn init my-project", delay: 0 },
  { cmd: "lawn upload final_cut_v3.mp4", delay: 800 },
  { cmd: "lawn share --team", delay: 1600 },
  { cmd: "# 3 comments received in 2 minutes", delay: 2400 },
];

function TypewriterText({ text, delay }: { text: string; delay: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="animate-pulse">▋</span>
      )}
    </span>
  );
}

export default function Homepage2() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050805] text-[#7cb87c] font-mono selection:bg-[#7cb87c] selection:text-[#050805]">
      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            #000 2px,
            #000 4px
          )`,
        }}
      />

      {/* CRT glow effect */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(124,184,124,0.1)]" />
      </div>

      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-30 px-6 py-3 border-b border-[#1a3a1a] bg-[#050805]/90 backdrop-blur">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <span className="text-[#7cb87c]">lawn@v2.4.1</span>
            <span className="text-[#4a6a4a]">|</span>
            <span className="text-[#4a6a4a]">{time}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-[#4a6a4a] hover:text-[#7cb87c] transition-colors">
              [docs]
            </Link>
            <Link href="/sign-in" className="text-[#4a6a4a] hover:text-[#7cb87c] transition-colors">
              [sign in]
            </Link>
            <Link href="/sign-up" className="text-[#7cb87c] hover:text-[#a0d0a0] transition-colors">
              [start free]
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-24 px-6 max-w-5xl mx-auto">
        {/* ASCII Logo */}
        <pre className="text-[#7cb87c] text-xs sm:text-sm leading-tight mb-12 overflow-x-auto">
{`
 ██╗      █████╗ ██╗    ██╗███╗   ██╗
 ██║     ██╔══██╗██║    ██║████╗  ██║
 ██║     ███████║██║ █╗ ██║██╔██╗ ██║
 ██║     ██╔══██║██║███╗██║██║╚██╗██║
 ███████╗██║  ██║╚███╔███╔╝██║ ╚████║
 ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═══╝
`}
        </pre>

        {/* Tagline */}
        <div className="mb-16">
          <p className="text-xl sm:text-2xl text-[#c8e6c8] mb-2">
            Video review for people who ship.
          </p>
          <p className="text-[#4a6a4a]">
            $ $5/mo • no seat fees • frame-accurate • fast
          </p>
        </div>

        {/* Terminal window */}
        <div className="border border-[#2a4a2a] rounded-lg overflow-hidden mb-16 bg-[#0a0f0a]">
          {/* Terminal header */}
          <div className="px-4 py-2 bg-[#0d150d] border-b border-[#1a3a1a] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#e57373]" />
            <div className="w-3 h-3 rounded-full bg-[#ffb74d]" />
            <div className="w-3 h-3 rounded-full bg-[#7cb87c]" />
            <span className="ml-4 text-xs text-[#4a6a4a]">~/projects/my-video</span>
          </div>

          {/* Terminal content */}
          <div className="p-6 space-y-3">
            {COMMANDS.map((item, i) => (
              <div key={i} className="flex">
                <span className="text-[#4a6a4a] mr-2">❯</span>
                <span className={item.cmd.startsWith("#") ? "text-[#4a6a4a]" : ""}>
                  <TypewriterText text={item.cmd} delay={item.delay} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1a3a1a] border border-[#1a3a1a] rounded-lg overflow-hidden mb-16">
          {[
            {
              title: "frame_accurate()",
              desc: "Comments snap to exact frames. No more 'around 2:34 somewhere'.",
              code: "comment.frame = 4821; // precise",
            },
            {
              title: "blazing_fast()",
              desc: "Built by a creator tired of waiting. Sub-second everything.",
              code: "latency: 0.3s // avg response",
            },
            {
              title: "self_host()",
              desc: "Your server, your data, your rules. Full control.",
              code: "docker run lawn/lawn:latest",
            },
            {
              title: "no_seat_tax()",
              desc: "One price, unlimited collaborators. No per-user pricing games.",
              code: "cost: $5/mo // unlimited seats",
            },
          ].map((feature, i) => (
            <div key={i} className="bg-[#0a0f0a] p-6">
              <h3 className="text-[#7cb87c] mb-2 text-lg">{feature.title}</h3>
              <p className="text-[#6a9a6a] text-sm mb-4">{feature.desc}</p>
              <code className="text-xs text-[#4a6a4a] block">{feature.code}</code>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="border border-[#1a3a1a] rounded-lg overflow-hidden mb-16">
          <div className="px-6 py-3 bg-[#0d150d] border-b border-[#1a3a1a]">
            <span className="text-[#4a6a4a] text-sm">// comparison.diff</span>
          </div>
          <div className="p-6 space-y-2 text-sm">
            <div className="text-[#e57373]">- frame.io: $228/year per editor</div>
            <div className="text-[#e57373]">- frame.io: scales with team size</div>
            <div className="text-[#e57373]">- frame.io: adobe ecosystem lock-in</div>
            <div className="text-[#4a6a4a] my-4">---</div>
            <div className="text-[#7cb87c]">+ lawn: $5/mo flat, unlimited seats</div>
            <div className="text-[#7cb87c]">+ lawn: no per-user pricing</div>
            <div className="text-[#7cb87c]">+ lawn: works with everything</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-16 border-t border-[#1a3a1a]">
          <p className="text-xl mb-6">Ready to escape the Adobe tax?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/sign-up"
              className="px-8 py-3 bg-[#7cb87c] text-[#050805] rounded font-medium hover:bg-[#a0d0a0] transition-colors"
            >
              $ lawn signup --start
            </Link>
            <Link
              href="/docs"
              className="px-8 py-3 border border-[#2a4a2a] rounded hover:border-[#7cb87c] hover:text-[#a0d0a0] transition-colors"
            >
              $ lawn docs
            </Link>
          </div>
          <p className="text-sm text-[#4a6a4a] mt-4">$5/mo • no per-seat pricing</p>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-[#1a3a1a] text-center text-sm text-[#4a6a4a]">
          <p>made with {"<3"} by creators, for creators</p>
          <p className="mt-2">MIT License • v2.4.1</p>
        </footer>
      </main>
    </div>
  );
}
