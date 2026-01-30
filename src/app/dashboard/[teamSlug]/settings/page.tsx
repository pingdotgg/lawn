"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, CreditCard, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { MemberInvite } from "@/components/teams/MemberInvite";

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;

  const team = useQuery(api.teams.getBySlug, { slug: teamSlug });
  const members = useQuery(
    api.teams.getMembers,
    team ? { teamId: team._id } : "skip"
  );
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  if (team === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (team === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">Team not found</div>
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
      router.push("/dashboard");
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
        href={`/dashboard/${teamSlug}`}
        className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to team
      </Link>

      <h1 className="text-2xl font-bold mb-6">Team Settings</h1>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Manage your team's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Team name</label>
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
                  <p>{team.name}</p>
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
              <label className="text-sm font-medium">Team URL</label>
              <p className="text-sm text-neutral-500 mt-1">
                {typeof window !== "undefined" ? window.location.origin : ""}/{team.slug}
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
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-neutral-500">{member.email}</p>
                  </div>
                  <Badge variant="secondary">{member.role}</Badge>
                </div>
              ))}
              {members && members.length > 5 && (
                <p className="text-sm text-neutral-500">
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
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <p className="text-2xl font-bold">{currentPlanFeatures.projects}</p>
                <p className="text-sm text-neutral-500">Projects</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <p className="text-2xl font-bold">{currentPlanFeatures.storage}</p>
                <p className="text-sm text-neutral-500">Storage</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <p className="text-2xl font-bold">{currentPlanFeatures.members}</p>
                <p className="text-sm text-neutral-500">Members</p>
              </div>
            </div>

            {team.plan === "free" && isOwner && (
              <div className="space-y-2">
                <Button className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade to Pro - $19/mo
                </Button>
                <Button variant="outline" className="w-full">
                  Upgrade to Team - $49/mo
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
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
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
