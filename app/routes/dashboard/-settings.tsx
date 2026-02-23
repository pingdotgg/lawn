
import { useConvex, useMutation, useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Trash2, Users } from "lucide-react";
import { MemberInvite } from "@/components/teams/MemberInvite";
import {
  dashboardHomePath,
  teamHomePath,
} from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { prewarmTeam } from "./-team.data";
import { useSettingsData } from "./-settings.data";
import { DashboardHeader } from "@/components/DashboardHeader";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

const PLAN_LIMITS = {
  basic: { storage: 100 * 1024 * 1024 * 1024, label: "100 GB" },
  pro: { storage: 1024 * 1024 * 1024 * 1024, label: "1 TB" },
};

export default function TeamSettingsPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate({});
  const pathname = useLocation().pathname;
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";
  const convex = useConvex();

  const { context, team, members } = useSettingsData({ teamSlug });
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const startCheckout = useAction(api.billingActions.startCheckout);
  const openBillingPortal = useAction(api.billingActions.openBillingPortal);

  const storage = useQuery(
    api.billing.getTeamStorage,
    team ? { teamId: team._id } : "skip",
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const canonicalSettingsPath = context
    ? `${context.canonicalPath}/settings`
    : null;
  const shouldCanonicalize =
    !!canonicalSettingsPath && pathname !== canonicalSettingsPath;

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
        "Are you sure you want to delete this team? This action cannot be undone and will delete all projects and videos."
      )
    )
      return;

    if (!confirm("Type the team name to confirm: " + team.name)) return;

    try {
      await deleteTeam({ teamId: team._id });
      navigate({ to: dashboardHomePath() });
    } catch (error) {
      console.error("Failed to delete team:", error);
    }
  };

  const handleCheckout = async (productId: string) => {
    setBillingLoading(true);
    try {
      const result = await startCheckout({ teamId: team._id, productId });
      const data = result?.data as unknown as Record<string, string> | null;
      const url = data?.checkout_url ?? data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const result = await openBillingPortal({ teamId: team._id });
      const url = result?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Billing portal failed:", error);
    } finally {
      setBillingLoading(false);
    }
  };

  const planLimit = PLAN_LIMITS[team.plan] ?? PLAN_LIMITS.basic;
  const usedBytes = storage?.totalBytes ?? 0;
  const usagePercent = Math.min(100, (usedBytes / planLimit.storage) * 100);

  const prewarmTeamIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmTeam(convex, { teamSlug: team.slug }),
  );

  return (
    <div className="h-full flex flex-col">
      <DashboardHeader paths={[
        { label: team.slug, href: teamHomePath(team.slug) },
        { label: "settings" }
      ]} />

      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-3xl space-y-6 mx-auto">
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
                    <p className="font-bold text-[#1a1a1a]">{member.userName}</p>
                    <p className="text-sm text-[#888]">{member.userEmail}</p>
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
                  <Badge variant="default">
                    {team.plan.charAt(0).toUpperCase() + team.plan.slice(1)}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Storage usage bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-[#1a1a1a]">Storage</label>
                <span className="text-sm font-mono text-[#888]">
                  {formatBytes(usedBytes)} / {planLimit.label}
                </span>
              </div>
              <div className="w-full h-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${usagePercent}%`,
                    backgroundColor: usagePercent > 90 ? "#dc2626" : "#2d5a2d",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                <p className="text-2xl font-black text-[#1a1a1a]">Unlimited</p>
                <p className="text-sm text-[#888]">Seats</p>
              </div>
              <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                <p className="text-2xl font-black text-[#1a1a1a]">Unlimited</p>
                <p className="text-sm text-[#888]">Projects</p>
              </div>
            </div>

            {isOwner && team.plan === "basic" && (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={billingLoading}
                  onClick={() => handleCheckout("pro")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade to Pro - $25/mo (1TB storage)
                </Button>
              </div>
            )}

            {isOwner && (
              <Button
                variant="outline"
                className="w-full mt-2"
                disabled={billingLoading}
                onClick={handleBillingPortal}
              >
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
