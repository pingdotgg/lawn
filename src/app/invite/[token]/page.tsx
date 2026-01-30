"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, Mail, Check } from "lucide-react";
import Link from "next/link";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isLoaded } = useUser();

  const invite = useQuery(api.teams.getInviteByToken, { token });
  const acceptInvite = useMutation(api.teams.acceptInvite);

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      const team = await acceptInvite({ token });
      if (team) {
        router.push(`/dashboard/${team.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  if (invite === undefined || !isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (invite === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle>Invalid or expired invite</CardTitle>
            <CardDescription>
              This invite link is no longer valid. Please ask for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Go to ReviewFlow
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-zinc-400" />
            </div>
            <CardTitle>You're invited to {invite.team?.name}</CardTitle>
            <CardDescription>
              {invite.invitedBy} has invited you to join as a {invite.role}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-zinc-950 rounded-lg flex items-center gap-3">
              <Mail className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-500">Invited email</p>
                <p className="font-medium">{invite.email}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 text-center">
              Sign in with the email address above to accept this invite.
            </p>
            <Link href={`/sign-in?redirect_url=/invite/${token}`} className="block">
              <Button className="w-full">Sign in to accept</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User signed in but with different email
  if (user.primaryEmailAddress?.emailAddress !== invite.email) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle>Different email address</CardTitle>
            <CardDescription>
              This invite was sent to {invite.email}, but you're signed in as{" "}
              {user.primaryEmailAddress?.emailAddress}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500 text-center">
              Please sign in with the correct email address to accept this invite.
            </p>
            <Link href={`/sign-in?redirect_url=/invite/${token}`} className="block">
              <Button className="w-full" variant="outline">
                Sign in with different account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User signed in with correct email
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-zinc-400" />
          </div>
          <CardTitle>Join {invite.team?.name}</CardTitle>
          <CardDescription>
            {invite.invitedBy} has invited you to join as a{" "}
            <Badge variant="secondary">{invite.role}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              "Joining..."
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Accept invitation
              </>
            )}
          </Button>
          <Link href="/" className="block">
            <Button variant="ghost" className="w-full">
              Decline
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
