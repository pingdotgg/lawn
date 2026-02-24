import { useAction, useMutation } from "convex/react";
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
import { dashboardHomePath, teamHomePath } from "@/lib/routes";
import { useSettingsData } from "./-settings.data";
import { DashboardHeader } from "@/components/DashboardHeader";

type BillingPlan = "basic" | "pro";

const GIBIBYTE = 1024 ** 3;
const TEBIBYTE = 1024 ** 4;

const BILLING_PLANS: Record<
  BillingPlan,
  {
    label: string;
    monthlyPriceUsd: number;
    storageLimitBytes: number;
    seats: string;
  }
> = {
  basic: {
    label: "Basic",
    monthlyPriceUsd: 5,
    storageLimitBytes: 100 * GIBIBYTE,
    seats: "Unlimited",
  },
  pro: {
    label: "Pro",
    monthlyPriceUsd: 25,
    storageLimitBytes: TEBIBYTE,
    seats: "Unlimited",
  },
};

function normalizeTeamPlan(plan: string): BillingPlan {
  return plan === "pro" || plan === "team" ? "pro" : "basic";
}

function formatBytes(bytes: number): string {
  if (bytes >= TEBIBYTE) return `${(bytes / TEBIBYTE).toFixed(1)} TB`;
  return `${(bytes / GIBIBYTE).toFixed(1)} GB`;
}

export default function TeamSettingsPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate({});
  const pathname = useLocation().pathname;
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";

  const { context, team, members, billing } = useSettingsData({ teamSlug });
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const createSubscriptionCheckout = useAction(
    api.billing.createSubscriptionCheckout,
  );
  const createCustomerPortalSession = useAction(
    api.billing.createCustomerPortalSession,
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [isCheckingOutPlan, setIsCheckingOutPlan] = useState<BillingPlan | null>(
    null,
  );
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

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
  const plan = billing?.plan ?? normalizeTeamPlan(team.plan);
  const planConfig = BILLING_PLANS[plan];
  const hasActiveSubscription = billing?.hasActiveSubscription ?? false;
  const subscriptionStatus = billing?.subscriptionStatus ?? "not_subscribed";
  const hasPortalAccess = isOwner && Boolean(billing?.stripeCustomerId);
  const currentPlanLabel = hasActiveSubscription ? planConfig.label : "Unpaid";
  const canDeleteTeam = isOwner && !hasActiveSubscription;

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
    if (hasActiveSubscription) {
      setBillingError(
        "Cancel the team's active subscription in billing before deleting this team.",
      );
      return;
    }

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

  const handleStartCheckout = async (targetPlan: BillingPlan) => {
    if (typeof window === "undefined") return;
    setBillingError(null);
    setIsCheckingOutPlan(targetPlan);

    try {
      const settingsPath = canonicalSettingsPath ?? `/dashboard/${team.slug}/settings`;
      const successUrl = `${window.location.origin}${settingsPath}?billing=success`;
      const cancelUrl = `${window.location.origin}${settingsPath}?billing=cancel`;
      const session = await createSubscriptionCheckout({
        teamId: team._id,
        plan: targetPlan,
        successUrl,
        cancelUrl,
      });

      if (!session.url) {
        throw new Error("Stripe checkout did not return a redirect URL.");
      }

      window.location.assign(session.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start checkout.";
      setBillingError(message);
    } finally {
      setIsCheckingOutPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    if (typeof window === "undefined") return;
    setBillingError(null);
    setIsOpeningPortal(true);

    try {
      const settingsPath = canonicalSettingsPath ?? `/dashboard/${team.slug}/settings`;
      const returnUrl = `${window.location.origin}${settingsPath}`;
      const session = await createCustomerPortalSession({
        teamId: team._id,
        returnUrl,
      });

      window.location.assign(session.url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to open Stripe billing portal.";
      setBillingError(message);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <DashboardHeader
        paths={[{ label: team.slug, href: teamHomePath(team.slug) }, { label: "settings" }]}
      />

      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-3xl space-y-6 mx-auto">
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plan & Billing</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    Current plan:
                    <Badge variant={hasActiveSubscription && plan === "pro" ? "default" : "secondary"}>
                      {currentPlanLabel}
                    </Badge>
                    <span className="text-xs uppercase tracking-wide text-[#888]">
                      {subscriptionStatus}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                  <p className="text-2xl font-black text-[#1a1a1a]">{planConfig.seats}</p>
                  <p className="text-sm text-[#888]">Seats</p>
                </div>
                <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                  <p className="text-2xl font-black text-[#1a1a1a]">
                    {formatBytes(planConfig.storageLimitBytes)}
                  </p>
                  <p className="text-sm text-[#888]">Storage limit</p>
                </div>
                <div className="text-center p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                  <p className="text-2xl font-black text-[#1a1a1a]">
                    {billing ? formatBytes(billing.storageUsedBytes) : "—"}
                  </p>
                  <p className="text-sm text-[#888]">Storage used</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(BILLING_PLANS) as BillingPlan[]).map((planId) => {
                  const config = BILLING_PLANS[planId];
                  const isCurrentPlan = planId === plan;
                  return (
                    <div
                      key={planId}
                      className="border-2 border-[#1a1a1a] p-4 bg-[#f0f0e8] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-black text-[#1a1a1a]">{config.label}</p>
                        {isCurrentPlan && hasActiveSubscription && (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-black text-[#1a1a1a]">
                        ${config.monthlyPriceUsd}
                        <span className="text-sm font-bold text-[#888]">/month</span>
                      </p>
                      <div className="text-sm text-[#888] space-y-1">
                        <p>{config.seats} seats</p>
                        <p>{formatBytes(config.storageLimitBytes)} storage</p>
                      </div>
                      {isOwner && !hasActiveSubscription && (
                        <Button
                          variant={planId === "pro" ? "primary" : "default"}
                          className="w-full"
                          disabled={isCheckingOutPlan !== null}
                          onClick={() => void handleStartCheckout(planId)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isCheckingOutPlan === planId
                            ? "Redirecting..."
                            : `Start ${config.label}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {hasPortalAccess && (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isOpeningPortal}
                  onClick={() => void handleOpenPortal()}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isOpeningPortal ? "Opening billing portal..." : "Manage subscription"}
                </Button>
              )}

              {billingError && (
                <p className="text-sm font-bold text-[#dc2626]">{billingError}</p>
              )}

              {!hasActiveSubscription && (
                <p className="text-sm text-[#888]">
                  This team requires an active paid subscription to create projects and upload new
                  videos.
                </p>
              )}
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-[#dc2626]">
              <CardHeader>
                <CardTitle className="text-[#dc2626]">Danger Zone</CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTeam}
                  disabled={!canDeleteTeam}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete team
                </Button>
                {!canDeleteTeam && (
                  <p className="text-sm text-[#888] mt-3">
                    Team deletion is blocked while billing is active. Cancel the subscription first.
                  </p>
                )}
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
