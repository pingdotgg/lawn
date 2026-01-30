import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Video, Users, MessageSquare, Link as LinkIcon, Play, CheckCircle } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            <span className="font-semibold text-lg">ReviewFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Video review made simple
          </h1>
          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            ReviewFlow is the video collaboration platform built for indie creators
            and small teams. Upload, review, and share your work with ease.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg">
                <Play className="mr-2 h-4 w-4" />
                Start for free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need for video feedback
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Timestamp comments</h3>
              <p className="text-neutral-600">
                Leave feedback at exact moments. Comments sync in real-time
                and show as markers on the timeline.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Team collaboration</h3>
              <p className="text-neutral-600">
                Organize projects by team. Invite members with different
                roles and work together seamlessly.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Easy sharing</h3>
              <p className="text-neutral-600">
                Create shareable links with optional passwords and expiration.
                No account needed to view.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Simple pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="border rounded-xl p-6 bg-white">
              <h3 className="font-semibold text-lg mb-2">Free</h3>
              <p className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal text-neutral-500">/mo</span></p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  1 project
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  5GB storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  3 team members
                </li>
              </ul>
              <Link href="/sign-up">
                <Button variant="outline" className="w-full">Get started</Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="border-2 border-neutral-900 rounded-xl p-6 bg-white relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-3 py-1 rounded-full">
                Popular
              </div>
              <h3 className="font-semibold text-lg mb-2">Pro</h3>
              <p className="text-3xl font-bold mb-4">$19<span className="text-sm font-normal text-neutral-500">/mo</span></p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited projects
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  100GB storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  10 team members
                </li>
              </ul>
              <Link href="/sign-up">
                <Button className="w-full">Get started</Button>
              </Link>
            </div>

            {/* Team */}
            <div className="border rounded-xl p-6 bg-white">
              <h3 className="font-semibold text-lg mb-2">Team</h3>
              <p className="text-3xl font-bold mb-4">$49<span className="text-sm font-normal text-neutral-500">/mo</span></p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited projects
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  500GB storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited members
                </li>
              </ul>
              <Link href="/sign-up">
                <Button variant="outline" className="w-full">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-500">
            <Video className="h-4 w-4" />
            <span className="text-sm">ReviewFlow</span>
          </div>
          <p className="text-sm text-neutral-500">
            Built for creators, by creators.
          </p>
        </div>
      </footer>
    </div>
  );
}
