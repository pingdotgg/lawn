import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";

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
    '--background': '#f0f0e8',
    '--background-alt': '#1a1a1a',
    '--surface': '#ffffff',
    '--surface-alt': '#e8e8e0',
    '--surface-strong': '#1a1a1a',
    '--surface-muted': '#d8d8d0',
    '--foreground': '#1a1a1a',
    '--foreground-muted': '#888888',
    '--foreground-subtle': '#aaaaaa',
    '--foreground-inverse': '#f0f0e8',
    '--border': '#1a1a1a',
    '--border-subtle': '#cccccc',
    '--accent': '#2d5a2d',
    '--accent-hover': '#3a6a3a',
    '--accent-light': '#7cb87c',
    '--shadow-color': '#1a1a1a',
    '--shadow-accent': 'rgba(45,90,45,1)',
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen font-mono selection:bg-[#2d5a2d] selection:text-[#f0f0e8]" 
      style={{ ...lightModeVars, backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      {/* Minimal nav */}
      <nav className={`fixed w-full top-0 z-50 px-6 py-4 flex justify-between items-center transition-all duration-200 ${scrolled ? 'bg-[#f0f0e8] text-[#1a1a1a] border-b-2 border-[#1a1a1a]' : 'bg-transparent text-[#f0f0e8] drop-shadow-md'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-2xl font-black tracking-tighter transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>lawn</span>
        </div>
        <div className="flex gap-6 items-center text-sm font-bold uppercase tracking-wide">
          <Link to="/sign-in" className="hover:underline underline-offset-4">Log in</Link>
          <Link to="/sign-up" className={`px-4 py-2 border-2 transition-colors ${scrolled ? 'border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f0f0e8]' : 'border-[#f0f0e8] hover:bg-[#f0f0e8] hover:text-[#1a1a1a]'}`}>Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section 
        className="relative px-6 pt-32 pb-24 min-h-[85vh] flex flex-col justify-end bg-cover bg-center bg-no-repeat text-[#f0f0e8] border-b-2 border-[#1a1a1a]"
        style={{ backgroundImage: `url('/grassy-bg.avif')` }}
      >
        {/* Lighter tint since text is now in highly contrasting blocks or heavily shadowed */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto">
          {/* Massive Title with Brutalist Depth */}
          <h1 
            className="text-[25vw] sm:text-[22vw] font-black leading-[0.75] tracking-tighter ml-[-0.5vw]"
            style={{ 
              textShadow: '8px 8px 0 #1a1a1a, 0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            lawn
          </h1>

          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-12 mt-16 md:mt-24">
            
            {/* Highly Creative Contrast Subheadline Blocks (Stickers) */}
            <div className="flex flex-col items-start gap-4">
              <div className="bg-[#f0f0e8] text-[#1a1a1a] px-6 py-3 md:px-8 md:py-4 border-2 border-[#1a1a1a] shadow-[8px_8px_0px_0px_var(--shadow-color)] -rotate-2 origin-bottom-left">
                <p className="text-2xl md:text-4xl font-black tracking-tight uppercase whitespace-nowrap">Video review for creative teams.</p>
              </div>
              <div className="bg-[#2d5a2d] text-[#f0f0e8] px-6 py-3 md:px-8 md:py-4 border-2 border-[#1a1a1a] shadow-[8px_8px_0px_0px_var(--shadow-color)] rotate-1 origin-top-left ml-4 md:ml-8">
                <p className="text-xl md:text-3xl font-black tracking-tight uppercase">Less features. No bull$#!t.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 lg:justify-end pb-2">
              <div className="bg-[#f0f0e8] text-[#1a1a1a] px-8 py-5 border-2 border-[#1a1a1a] shadow-[8px_8px_0px_0px_var(--shadow-color)]">
                <span className="text-4xl font-black">$5/mo</span>
                <span className="block text-sm font-bold uppercase tracking-wider text-[#888] mt-1">Unlimited seats</span>
              </div>
              <Link to="/sign-up"
                className="bg-[#1a1a1a] text-[#f0f0e8] px-8 py-5 border-2 border-[#1a1a1a] font-black text-xl hover:bg-[#2d5a2d] transition-colors flex items-center justify-center shadow-[8px_8px_0px_0px_var(--shadow-color)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[6px_6px_0px_0px_var(--shadow-color)]"
              >
                START FREE TRIAL →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brutalist Value Props Bar */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#f0f0e8]">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#1a1a1a]">
          {[
            { id: "01", title: "FRAME EXACT", desc: "Drop a marker on the exact frame. No 'at 1:23ish' nonsense." },
            { id: "02", title: "ZERO LATENCY", desc: "Instant playback. Built for speed, not loading spinners." },
            { id: "03", title: "FLAT PRICING", desc: "$5 covers the whole agency. Stop counting seats." },
            { id: "04", title: "TOOL AGNOSTIC", desc: "Premiere, Final Cut, Resolve. We don't care. Bring whatever." },
          ].map((item, i) => (
            <div key={i} className="p-8 lg:p-12 group hover:bg-[#1a1a1a] hover:text-[#f0f0e8] transition-colors flex flex-col">
              <div className="text-sm font-black text-[#888] group-hover:text-[#7cb87c] mb-8">/{item.id}</div>
              <h3 className="text-3xl lg:text-4xl font-black mb-4 uppercase tracking-tighter leading-none">{item.title}</h3>
              <p className="text-lg font-medium opacity-80 mt-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - Completely Rethought */}
      <section className="border-b-2 border-[#1a1a1a] bg-[#e8e8e0] px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-16 text-center">
            HOW IT WORKS.
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { step: "1", action: "UPLOAD", desc: "Drag and drop your cut. We process it instantly." },
              { step: "2", action: "SHARE", desc: "Send a link. No account required for clients." },
              { step: "3", action: "REVIEW", desc: "Click to comment on exact frames. Export to your NLE." },
            ].map((item, i) => (
              <div key={i} className="bg-[#f0f0e8] border-2 border-[#1a1a1a] shadow-[12px_12px_0px_0px_var(--shadow-color)] flex flex-col hover:-translate-y-2 hover:translate-x-2 hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all">
                <div className="border-b-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#f0f0e8] p-6 flex justify-between items-end">
                  <span className="text-7xl font-black leading-none">{item.step}</span>
                  <span className="text-xl font-bold tracking-widest text-[#888] mb-1">STEP</span>
                </div>
                <div className="p-8 flex-grow flex flex-col">
                  <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4 text-[#2d5a2d]">{item.action}</h3>
                  <p className="text-lg font-medium text-[#1a1a1a]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="px-6 py-24 md:py-32 border-b-2 border-[#1a1a1a] bg-[#f0f0e8]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-1/3">
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
                THE<br/>RIVAL.
              </h2>
              <p className="text-xl text-[#888] font-medium max-w-sm">
                Frame.io is solid software. But you're paying for enterprise features you don't need.
              </p>
            </div>

            <div className="lg:w-2/3">
              <div className="grid grid-cols-1 md:grid-cols-2 border-2 border-[#1a1a1a] shadow-[12px_12px_0px_0px_var(--shadow-color)]">
                {/* Competitor */}
                <div className="p-8 md:p-12 border-b-2 md:border-b-0 md:border-r-2 border-[#1a1a1a] bg-[#ffffff]">
                  <div className="text-sm font-bold tracking-widest text-[#888] mb-2">THE OTHER GUYS</div>
                  <div className="text-5xl font-black tracking-tighter mb-8">Frame.io</div>
                  
                  <div className="mb-8">
                    <div className="text-3xl font-black">$19</div>
                    <div className="text-[#888] font-bold uppercase text-sm tracking-wider">Per user / month</div>
                  </div>

                  <ul className="space-y-4 text-lg font-medium text-[#1a1a1a]">
                    <li className="flex items-start gap-3">
                      <span className="text-[#dc2626] font-black">×</span>
                      Complex interface
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#dc2626] font-black">×</span>
                      Punishes you for growing
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#dc2626] font-black">×</span>
                      Bloated ecosystem
                    </li>
                  </ul>
                </div>

                {/* Us */}
                <div className="p-8 md:p-12 bg-[#1a1a1a] text-[#f0f0e8]">
                  <div className="text-sm font-bold tracking-widest text-[#7cb87c] mb-2">THE SOLUTION</div>
                  <div className="text-5xl font-black tracking-tighter mb-8 text-[#7cb87c]">lawn</div>
                  
                  <div className="mb-8">
                    <div className="text-3xl font-black text-[#7cb87c]">$5</div>
                    <div className="text-[#888] font-bold uppercase text-sm tracking-wider">Flat total / month</div>
                  </div>

                  <ul className="space-y-4 text-lg font-medium">
                    <li className="flex items-start gap-3">
                      <span className="text-[#7cb87c] font-black">✓</span>
                      Stupidly fast
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#7cb87c] font-black">✓</span>
                      Invite the whole team
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#7cb87c] font-black">✓</span>
                      Just what you need
                    </li>
                  </ul>
                  
                  <div className="mt-12 pt-6 border-t border-[#333]">
                    <span className="block text-sm font-bold text-[#888] uppercase tracking-wider mb-1">Yearly savings (5 users)</span>
                    <span className="text-4xl font-black text-[#7cb87c]">$1,080</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="px-6 py-32 bg-[#2d5a2d] text-[#f0f0e8] border-b-2 border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto text-center">
          <blockquote className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight mb-8">
            "I built lawn because I got tired of waiting for Frame.io to load. Video review should be instant."
          </blockquote>
          <a href="https://x.com/theo" target="_blank" rel="noopener noreferrer" className="inline-block border-2 border-[#f0f0e8] px-6 py-3 font-bold uppercase tracking-wider hover:bg-[#f0f0e8] hover:text-[#2d5a2d] transition-colors">
            — Theo
          </a>
        </div>
      </section>

      {/* Massive CTA */}
      <section className="px-6 py-32 bg-[#f0f0e8]">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8">
            TRY IT<br/>FREE.
          </h2>
          <p className="text-2xl text-[#888] font-medium mb-12">
            14 days. No credit card. Zero risk.
          </p>
          <Link to="/sign-up"
            className="bg-[#1a1a1a] text-[#f0f0e8] px-12 py-6 border-2 border-[#1a1a1a] text-2xl font-black uppercase tracking-wider hover:bg-[#2d5a2d] hover:border-[#2d5a2d] transition-colors shadow-[12px_12px_0px_0px_var(--shadow-accent)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[8px_8px_0px_0px_var(--shadow-accent)]"
          >
            START YOUR TRIAL
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] px-6 py-12 bg-[#e8e8e0]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-black text-3xl tracking-tighter">lawn.</span>
          <div className="flex gap-8 text-sm font-bold uppercase tracking-wider">
            <a href="/github" className="hover:text-[#2d5a2d] transition-colors">GitHub</a>
            <a href="/docs" className="hover:text-[#2d5a2d] transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
