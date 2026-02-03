
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Trash2, Users } from "lucide-react";
import { MemberInvite } from "@/components/teams/MemberInvite";
import {
  dashboardHomePath,
  teamHomePath,
} from "@/lib/routes";

export default function TeamSettingsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";

  const context = useQuery(api.workspace.resolveContext, { teamSlug });
  const team = context?.team;
  const members = useQuery(
    api.teams.getMembers,
    team ? { teamId: team._id } : "skip",
  );
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const canonicalSettingsPath = context
    ? `${context.canonicalPath}/settings`
    : null;
  const shouldCanonicalize =
    !!canonicalSettingsPath && pathname !== canonicalSettingsPath;

  useEffect(() => {
    if (shouldCanonicalize && canonicalSettingsPath) {
      navigate(canonicalSettingsPath, { replace: true });
    }
  }, [shouldCanonicalize, canonicalSettingsPath, navigate]);

  if (context === undefined || shouldCanonicalize) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (context === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Team not found</div>
      </div>
    );
  }

  const isOwner = team.role === "owner";
  const isAdmin = team.role === "owner" || team.role === "admin";

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    try {
      await updateTeam({ teamId: team._id, name: editedName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update team name:", error);
    }
  };

  const handleDeleteTeam = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this team? This action cannot be undone and will delete all projects and videos."
      )
    )
      return;

    if (!confirm("Type the team name to confirm: " + team.name)) return;

    try {
      await deleteTeam({ teamId: team._id });
      navigate(dashboardHomePath());
    } catch (error) {
      console.error("Failed to delete team:", error);
    }
  };

  const planFeatures = {
    free: { projects: 1, storage: "5GB", members: 3 },
    pro: { projects: "Unlimited", storage: "100GB", members: 10 },
    team: { projects: "Unlimited", storage: "500GB", members: "Unlimited" },
  };

  const currentPlanFeatures = planFeatures[team.plan];

  return (
    <div className="p-8 max-w-3xl">
      <Link
        to={teamHomePath(team.slug)}
        className="inline-flex items-center text-sm text-[#888] hover:text-[#1a1a1a] mb-6 transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to team
      </Link>

      <h1 className="text-2xl font-black text-[#1a1a1a] mb-6">Team Settings</h1>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Manage your team&apos;s basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-bold text-[#1a1a1a]">Team name</label>
              {isEditingName ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    autoFocus
                  />
                  <Button onClick={handleSaveName}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[#1a1a1a]">{team.name}</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditedName(team.name);
                        setIsEditingName(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-sm font-bold text-[#1a1a1a]">Team URL</label>
              <p className="text-sm text-[#888] mt-1">
                {typeof window !== "undefined"
                  ? `${window.location.origin}${teamHomePath(team.slug)}`
                  : teamHomePath(team.slug)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  {members?.length || 0} member{members?.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => setMemberDialogOpen(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members?.slice(0, 5).map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between py-2 border-b-2 border-[#e8e8e0] last:border-0"
                >
                  <div>
                    <p className="font-bold text-[#1a1a1a]">{member.name}</p>
                    <p className="text-sm text-[#888]">{member.email}</p>
                  </div>
                  <Badge variant="secondary">{member.role}</Badge>
                </div>
              ))}
              {members && members.length > 5 && (
                <p className="text-sm text-[#888]">
                  And {members.length - 5} more...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan & Billing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Plan & Billing</CardTitle>
                <CardDescription>
                  Current plan:{" "}
                  <Badge variant={team.plan === "free" ? "secondary" : "default"}>
                    {team.plan.charAt(0).toUpperCase() + team.plan.slice(1)}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                <p className="text-2xl font-black text-[#1a1a1a]">{currentPlanFeatures.projects}</p>
                <p className="text-sm text-[#888]">Projects</p>
              </div>
              <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                <p className="text-2xl font-black text-[#1a1a1a]">{currentPlanFeatures.storage}</p>
                <p className="text-sm text-[#888]">Storage</p>
              </div>
              <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                <p className="text-2xl font-black text-[#1a1a1a]">{currentPlanFeatures.members}</p>
                <p className="text-sm text-[#888]">Members</p>
              </div>
            </div>

            {team.plan === "free" && isOwner && (
              <div className="space-y-2">
                <Button variant="primary" className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade to Pro - $5/mo
                </Button>
              </div>
            )}

            {team.plan !== "free" && isOwner && (
              <Button variant="outline" className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage subscription
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {isOwner && (
          <Card className="border-[#dc2626]">
            <CardHeader>
              <CardTitle className="text-[#dc2626]">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDeleteTeam}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete team
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && (
        <MemberInvite
          teamId={team._id}
          open={memberDialogOpen}
          onOpenChange={setMemberDialogOpen}
        />
      )}
    </div>
  );
}
