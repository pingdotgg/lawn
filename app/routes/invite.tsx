
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { useUser } from "@clerk/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, Mail, Check } from "lucide-react";
import { teamHomePath } from "@/lib/routes";

export default function InvitePage() {
  const params = useParams();
  const navigate = useNavigate();
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
        navigate(teamHomePath(team.slug));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  if (invite === undefined || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (invite === null) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#dc2626]/10 flex items-center justify-center mb-4 border-2 border-[#dc2626]">
              <AlertCircle className="h-6 w-6 text-[#dc2626]" />
            </div>
            <CardTitle>Invalid or expired invite</CardTitle>
            <CardDescription>
              This invite link is no longer valid. Please ask for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/" className="block">
              <Button variant="outline" className="w-full">
                Go to lawn
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
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#e8e8e0] flex items-center justify-center mb-4 border-2 border-[#1a1a1a]">
              <Users className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle>You&apos;re invited to {invite.team?.name}</CardTitle>
            <CardDescription>
              {invite.invitedBy} has invited you to join as a {invite.role}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-[#e8e8e0] border-2 border-[#1a1a1a] flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#888]" />
              <div>
                <p className="text-sm text-[#888]">Invited email</p>
                <p className="font-bold text-[#1a1a1a]">{invite.email}</p>
              </div>
            </div>
            <p className="text-sm text-[#888] text-center">
              Sign in with the email address above to accept this invite.
            </p>
            <Link to={`/sign-in?redirect_url=/invite/${token}`} className="block">
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
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#ca8a04]/10 flex items-center justify-center mb-4 border-2 border-[#ca8a04]">
              <AlertCircle className="h-6 w-6 text-[#ca8a04]" />
            </div>
            <CardTitle>Different email address</CardTitle>
            <CardDescription>
              This invite was sent to {invite.email}, but you&apos;re signed in as{" "}
              {user.primaryEmailAddress?.emailAddress}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#888] text-center">
              Please sign in with the correct email address to accept this invite.
            </p>
            <Link to={`/sign-in?redirect_url=/invite/${token}`} className="block">
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
    <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-[#e8e8e0] flex items-center justify-center mb-4 border-2 border-[#1a1a1a]">
            <Users className="h-6 w-6 text-[#888]" />
          </div>
          <CardTitle>Join {invite.team?.name}</CardTitle>
          <CardDescription>
            {invite.invitedBy} has invited you to join as a{" "}
            <Badge variant="secondary">{invite.role}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-[#dc2626]/10 text-[#dc2626] border-2 border-[#dc2626] text-sm">
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
          <Link to="/" className="block">
            <Button variant="ghost" className="w-full">
              Decline
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
