import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48L3N2Zz4=')] opacity-50" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#07070a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#07070a]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4zm11 4l5 4-5 4V8z" />
                </svg>
              </div>
            </div>
            <span className="text-lg font-semibold tracking-tight">ReviewFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-medium shadow-lg shadow-amber-500/20">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm text-zinc-400">Now with real-time collaboration</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Video feedback
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                at the speed of thought
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
              Stop drowning in email threads and messy file shares. ReviewFlow gives creative teams
              one place to upload, review, and approve video content with frame-accurate feedback.
            </p>

            {/* CTA Group */}
            <div className="flex flex-wrap items-center gap-4 mb-16">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-semibold text-base shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all">
                  Start reviewing for free
                </Button>
              </Link>
              <span className="text-sm text-zinc-600">No credit card required</span>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-8 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-[#07070a] bg-gradient-to-br from-zinc-700 to-zinc-800"
                      style={{ zIndex: 4 - i }}
                    />
                  ))}
                </div>
                <span>500+ creators</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>4.9/5 from reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Visual - Video Player Mockup */}
        <div className="max-w-7xl mx-auto mt-20">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent rounded-2xl blur-2xl opacity-50" />

            {/* Player container */}
            <div className="relative bg-zinc-900/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              {/* Video area */}
              <div className="aspect-video bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 relative">
                {/* Fake video content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors group">
                    <svg className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Comment markers on timeline mockup */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="h-1.5 bg-white/10 rounded-full relative">
                    <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                    {/* Comment dots */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-[15%] w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50 animate-pulse" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-[28%] w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-[67%] w-3 h-3 bg-orange-400 rounded-full shadow-lg shadow-orange-500/50" />
                  </div>
                </div>

                {/* Floating comment card */}
                <div className="absolute top-8 right-8 w-72 bg-zinc-900/95 backdrop-blur border border-white/10 rounded-xl p-4 shadow-2xl transform hover:-translate-y-1 transition-transform">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">Sarah Chen</span>
                        <span className="text-xs text-amber-400 font-mono">0:42</span>
                      </div>
                      <p className="text-sm text-zinc-400">Can we extend this transition by 2 frames? Feels a bit abrupt.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control bar */}
              <div className="px-4 py-3 bg-zinc-900/50 border-t border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    </div>
                    <span className="text-sm font-mono text-zinc-400">1:24 / 3:45</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">3 comments</span>
                  <div className="w-px h-4 bg-white/10" />
                  <span className="text-xs text-zinc-500">1080p</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to ship faster
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Built for the way modern creative teams actually work
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Frame-accurate comments</h3>
                <p className="text-zinc-500 leading-relaxed">
                  Click anywhere on the timeline to leave feedback at that exact moment. No more "around the 2 minute mark" guessing.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Instant playback</h3>
                <p className="text-zinc-500 leading-relaxed">
                  Adaptive streaming means smooth playback for everyone, even on slow connections. Automatic 480p fallback keeps reviews moving.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-violet-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.02] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Share with anyone</h3>
                <p className="text-zinc-500 leading-relaxed">
                  Generate secure links for clients who don't need accounts. Optional passwords and expiration dates for sensitive projects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-amber-500 font-medium text-sm tracking-wide uppercase mb-4 block">How it works</span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                From upload to approval in minutes, not days
              </h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Upload your video</h3>
                    <p className="text-zinc-500">Drag and drop files up to 10GB. Resumable uploads mean no lost progress on large files.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Invite your team</h3>
                    <p className="text-zinc-500">Add collaborators or generate a share link. They can start reviewing immediately.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Collect feedback</h3>
                    <p className="text-zinc-500">Comments appear in real-time on a shared timeline. Resolve them as you make changes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-zinc-900/80 border border-white/[0.08] rounded-2xl p-6">
                {/* Mini dashboard mockup */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Product Launch v3</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready for review</span>
                  </div>
                  <div className="aspect-video bg-zinc-800/50 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/30 to-zinc-800/30" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="h-1 bg-white/10 rounded-full">
                        <div className="h-full w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500">3 comments</span>
                      <span className="text-zinc-500">2 resolved</span>
                    </div>
                    <span className="text-zinc-400">Updated 2m ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-zinc-500">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="font-medium text-zinc-400 mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-zinc-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-3 text-zinc-400">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  1 project
                </li>
                <li className="flex items-center gap-3 text-zinc-400">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  5GB storage
                </li>
                <li className="flex items-center gap-3 text-zinc-400">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  3 team members
                </li>
              </ul>
              <Link href="/sign-up" className="block">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  Get started
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-b from-amber-500/[0.08] to-transparent border border-amber-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 rounded-full">
                  Most popular
                </span>
              </div>
              <h3 className="font-medium text-zinc-400 mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-zinc-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited projects
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  100GB storage
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  10 team members
                </li>
              </ul>
              <Link href="/sign-up" className="block">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-medium">
                  Start free trial
                </Button>
              </Link>
            </div>

            {/* Team */}
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="font-medium text-zinc-400 mb-2">Team</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-zinc-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-3 text-zinc-400">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited projects
                </li>
                <li className="flex items-center gap-3 text-zinc-400">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  500GB storage
                </li>
                <li className="flex items-center gap-3 text-zinc-400">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited members
                </li>
              </ul>
              <Link href="/sign-up" className="block">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  Contact sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to streamline your video reviews?
          </h2>
          <p className="text-lg text-zinc-500 mb-10">
            Join hundreds of creative teams who ship faster with ReviewFlow.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="h-14 px-10 text-base bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-semibold shadow-xl shadow-amber-500/25">
              Get started for free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#07070a]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4zm11 4l5 4-5 4V8z" />
              </svg>
            </div>
            <span className="font-medium">ReviewFlow</span>
          </div>
          <p className="text-sm text-zinc-600">
            Built for creators who care about feedback.
          </p>
        </div>
      </footer>
    </div>
  );
}
