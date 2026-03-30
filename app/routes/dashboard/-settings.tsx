import { useMutation, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil } from "lucide-react";
import { MemberInvite } from "@/components/teams/MemberInvite";
import { dashboardHomePath, teamHomePath } from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { useSettingsData } from "./-settings.data";
import { prewarmTeam } from "./-team.data";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function TeamSettingsPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate({});
  const pathname = useLocation().pathname;
  const convex = useConvex();
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";

  const { context, team, members } = useSettingsData({ teamSlug });
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const prewarmTeamIntentHandlers = useRoutePrewarmIntent(() => {
    if (!team?.slug) return;
    return prewarmTeam(convex, { teamSlug: team.slug });
  });

  const canonicalSettingsPath = context ? `${context.canonicalPath}/settings` : null;
  const isSettingsPath = pathname.endsWith("/settings");
  const shouldCanonicalize =
    isSettingsPath && !!canonicalSettingsPath && pathname !== canonicalSettingsPath;

  useEffect(() => {
    if (shouldCanonicalize && canonicalSettingsPath) {
      navigate({ to: canonicalSettingsPath, replace: true });
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
        "Are you sure you want to delete this team? This action cannot be undone and will delete all projects and videos.",
      )
    ) {
      return;
    }

    if (!confirm("Type the team name to confirm: " + team.name)) return;

    try {
      await deleteTeam({ teamId: team._id });
      navigate({ to: dashboardHomePath() });
    } catch (error) {
      console.error("Failed to delete team:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <DashboardHeader
        paths={[
          {
            label: team.slug,
            href: teamHomePath(team.slug),
            prewarmIntentHandlers: prewarmTeamIntentHandlers,
          },
          { label: "settings" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
          {/* Team name */}
          <div className="mb-8">
            {isEditingName ? (
              <div className="flex items-center gap-3">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-4xl font-black tracking-tight h-auto py-1 px-2 border-b-2 border-[#1a1a1a] border-t-0 border-l-0 border-r-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <Button size="sm" onClick={() => void handleSaveName()}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingName(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-baseline gap-3 group">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-[#1a1a1a]">
                  {team.name}
                </h1>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditedName(team.name);
                      setIsEditingName(true);
                    }}
                    className="text-[#888] hover:text-[#1a1a1a] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm font-mono text-[#888] mt-1">
              {typeof window !== "undefined"
                ? `${window.location.origin}${teamHomePath(team.slug)}`
                : teamHomePath(team.slug)}
            </p>
          </div>

          {/* Members */}
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#888]">
                Members
                <span className="ml-2 text-[#1a1a1a]">
                  {members?.length || 0}
                </span>
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setMemberDialogOpen(true)}
                  className="text-xs font-bold uppercase tracking-wider text-[#2d5a2d] hover:text-[#3a6a3a] underline underline-offset-2"
                >
                  + Invite
                </button>
              )}
            </div>

            <div className="border-t-2 border-[#1a1a1a]">
              {members?.slice(0, 8).map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between py-3 border-b border-[#ccc]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#1a1a1a] truncate">
                      {member.userName}
                    </p>
                    <p className="text-xs text-[#888] truncate">
                      {member.userEmail}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888] shrink-0 ml-3">
                    {member.role}
                  </span>
                </div>
              ))}
              {members && members.length > 8 && (
                <button
                  onClick={() => setMemberDialogOpen(true)}
                  className="text-xs text-[#888] hover:text-[#1a1a1a] py-3 underline"
                >
                  +{members.length - 8} more
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          {isOwner && (
            <div className="border-t-2 border-[#dc2626]/30 mt-16 pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1a1a1a]">
                  Delete team
                </p>
                <p className="text-xs text-[#888] mt-0.5">
                  Permanently remove this team, all projects, and videos.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTeam}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
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
