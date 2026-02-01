"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Design 5: Immersive Product Demo
// The product IS the hero - full interface mockup with live interactions

export default function Homepage5() {
  const [currentTime, setCurrentTime] = useState(84.5);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeComment, setActiveComment] = useState<number | null>(null);
  const [showNewComment, setShowNewComment] = useState(false);

  const comments = [
    { id: 1, time: 24.3, user: "Sarah", text: "Love this opening shot!", color: "#7cb87c" },
    { id: 2, time: 67.8, user: "Mike", text: "Can we try a faster cut here?", color: "#81c784" },
    { id: 3, time: 84.5, user: "You", text: "Perfect transition 👌", color: "#a0d0a0" },
  ];

  const duration = 186;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.1;
        return next > duration ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Show "new comment" animation periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setShowNewComment(true);
      setTimeout(() => setShowNewComment(false), 3000);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#040604] text-[#c8e6c8]">
      {/* Ambient background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124, 184, 124, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(124, 184, 124, 0.05) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating nav */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 p-1.5 bg-[#0d140d]/80 backdrop-blur-xl border border-[#2a4a2a]/50 rounded-full">
          <Link href="/" className="px-5 py-2 text-sm font-medium text-[#7cb87c]">
            lawn
          </Link>
          <div className="w-px h-4 bg-[#2a4a2a]" />
          <Link href="/features" className="px-4 py-2 text-sm text-[#6a9a6a] hover:text-[#c8e6c8] transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="px-4 py-2 text-sm text-[#6a9a6a] hover:text-[#c8e6c8] transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="px-4 py-2 text-sm text-[#6a9a6a] hover:text-[#c8e6c8] transition-colors">
            Docs
          </Link>
          <div className="w-px h-4 bg-[#2a4a2a]" />
          <Link href="/sign-in" className="px-4 py-2 text-sm text-[#6a9a6a] hover:text-[#c8e6c8] transition-colors">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2 text-sm font-medium bg-[#7cb87c] text-[#040604] rounded-full hover:bg-[#a0d0a0] transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero with embedded product */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
        {/* Headline above the player */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] mb-4">
            Video review that just{" "}
            <span className="text-[#7cb87c] italic">works</span>
          </h1>
          <p className="text-lg text-[#6a9a6a] max-w-xl mx-auto">
            Drop a comment on any frame. Share with anyone. $5/mo, unlimited seats.
          </p>
        </div>

        {/* Product mockup - the hero */}
        <div className="w-full max-w-5xl">
          <div className="relative rounded-2xl overflow-hidden bg-[#0a0f0a] border border-[#2a4a2a]/70 shadow-2xl shadow-black/50">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0d150d] border-b border-[#1a2a1a]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#e57373]/80" />
                <div className="w-3 h-3 rounded-full bg-[#ffb74d]/80" />
                <div className="w-3 h-3 rounded-full bg-[#7cb87c]/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-[#0a0f0a] rounded-md text-xs text-[#4a6a4a]">
                  Project: Brand Campaign Final v3
                </div>
              </div>
              <div className="w-16" /> {/* Spacer for symmetry */}
            </div>

            {/* Main player area */}
            <div className="flex">
              {/* Video area */}
              <div className="flex-1">
                {/* Video frame */}
                <div className="aspect-video bg-gradient-to-br from-[#0d1a0d] via-[#0a120a] to-[#0d1a0d] relative">
                  {/* Fake video content - gradient animation */}
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: `linear-gradient(${currentTime * 2}deg, #1a2a1a, #0d1a0d, #1a3a1a)`,
                      transition: "background 0.1s linear",
                    }}
                  />

                  {/* Center play indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-20 h-20 rounded-full bg-black/30 backdrop-blur flex items-center justify-center hover:bg-black/50 transition-colors"
                    >
                      {isPlaying ? (
                        <div className="flex gap-1.5">
                          <div className="w-2 h-6 bg-white/90 rounded-sm" />
                          <div className="w-2 h-6 bg-white/90 rounded-sm" />
                        </div>
                      ) : (
                        <div className="w-0 h-0 border-l-[18px] border-l-white/90 border-y-[12px] border-y-transparent ml-1.5" />
                      )}
                    </button>
                  </div>

                  {/* Comment markers on video */}
                  {comments.map((comment) => {
                    const position = (comment.time / duration) * 100;
                    return (
                      <div
                        key={comment.id}
                        className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform ${
                          activeComment === comment.id ? "scale-125 z-10" : ""
                        }`}
                        style={{
                          backgroundColor: comment.color,
                          color: "#040604",
                          left: `${15 + (comment.id * 20)}%`,
                          top: `${20 + (comment.id * 15)}%`,
                        }}
                        onMouseEnter={() => setActiveComment(comment.id)}
                        onMouseLeave={() => setActiveComment(null)}
                      >
                        {comment.user[0]}
                        {activeComment === comment.id && (
                          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#0d150d] border border-[#2a4a2a] rounded-lg px-3 py-2 text-xs text-[#c8e6c8] font-normal">
                            {comment.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Timeline/scrubber */}
                <div className="px-4 py-3 bg-[#080d08]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="text-[#7cb87c] hover:text-[#a0d0a0]"
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    <span className="text-xs font-mono text-[#6a9a6a] w-12">
                      {formatTime(currentTime)}
                    </span>

                    {/* Timeline bar */}
                    <div className="flex-1 h-1.5 bg-[#1a2a1a] rounded-full relative cursor-pointer group">
                      {/* Progress */}
                      <div
                        className="absolute h-full bg-[#7cb87c] rounded-full"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                      {/* Comment markers */}
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                          style={{
                            left: `${(comment.time / duration) * 100}%`,
                            backgroundColor: comment.color,
                          }}
                        />
                      ))}
                      {/* Playhead */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
                      />
                    </div>

                    <span className="text-xs font-mono text-[#4a6a4a] w-12 text-right">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comments sidebar */}
              <div className="w-72 border-l border-[#1a2a1a] bg-[#080d08] flex flex-col">
                <div className="px-4 py-3 border-b border-[#1a2a1a] flex items-center justify-between">
                  <span className="text-sm font-medium">Comments</span>
                  <span className="text-xs text-[#4a6a4a]">{comments.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* New comment notification */}
                  {showNewComment && (
                    <div className="px-4 py-3 bg-[#7cb87c]/10 border-b border-[#7cb87c]/20 animate-pulse">
                      <div className="flex items-center gap-2 text-xs text-[#7cb87c]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#7cb87c]" />
                        New comment from Alex
                      </div>
                    </div>
                  )}

                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`px-4 py-3 border-b border-[#1a2a1a] cursor-pointer transition-colors ${
                        activeComment === comment.id ? "bg-[#0d150d]" : "hover:bg-[#0a0f0a]"
                      }`}
                      onMouseEnter={() => setActiveComment(comment.id)}
                      onMouseLeave={() => setActiveComment(null)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ backgroundColor: comment.color, color: "#040604" }}
                        >
                          {comment.user[0]}
                        </div>
                        <span className="text-xs font-medium">{comment.user}</span>
                        <span className="text-xs text-[#4a6a4a] ml-auto font-mono">
                          {formatTime(comment.time)}
                        </span>
                      </div>
                      <p className="text-sm text-[#a0d0a0]">{comment.text}</p>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <div className="p-4 border-t border-[#1a2a1a]">
                  <div className="flex items-center gap-2 p-2 bg-[#0a0f0a] border border-[#2a4a2a] rounded-lg">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder-[#4a6a4a]"
                    />
                    <button className="p-1.5 text-[#7cb87c] hover:text-[#a0d0a0]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA below */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-[#7cb87c] text-[#040604] rounded-full font-medium hover:bg-[#a0d0a0] transition-colors"
          >
            Start your trial →
          </Link>
          <p className="text-sm text-[#4a6a4a]">$5/month • unlimited team members</p>
        </div>
      </section>

      {/* Why lawn section */}
      <section className="px-4 py-24 border-t border-[#1a2a1a]/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-16">
            Built different
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Frame-perfect",
                desc: "Comments attach to the exact frame, not fuzzy timestamps. Click any marker to jump right there.",
                stat: "0.3s",
                statLabel: "avg response",
              },
              {
                title: "No seat tax",
                desc: "Flat $5/month for your whole team. No per-user pricing—add everyone.",
                stat: "$5",
                statLabel: "unlimited seats",
              },
              {
                title: "Your data",
                desc: "Self-host on your own servers or use our cloud. Either way, you own everything.",
                stat: "100%",
                statLabel: "control",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-[#0a0f0a] border border-[#1a2a1a] hover:border-[#2a4a2a] transition-colors"
              >
                <div className="text-3xl font-bold text-[#7cb87c] mb-1">{item.stat}</div>
                <div className="text-xs text-[#4a6a4a] mb-4">{item.statLabel}</div>
                <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-[#6a9a6a] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-[#1a2a1a]/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm font-medium text-[#7cb87c]">lawn</span>
          <div className="flex gap-6 text-sm text-[#4a6a4a]">
            <Link href="/github" className="hover:text-[#7cb87c] transition-colors">GitHub</Link>
            <Link href="/docs" className="hover:text-[#7cb87c] transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-[#7cb87c] transition-colors">Privacy</Link>
          </div>
          <span className="text-xs text-[#4a6a4a]">© 2025</span>
        </div>
      </footer>
    </div>
  );
}
