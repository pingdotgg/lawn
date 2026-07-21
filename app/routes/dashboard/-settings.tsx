import { useAction, useConvex, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Trash2, Check, Pencil } from "lucide-react";
import { MemberInvite } from "@/components/teams/MemberInvite";
import { dashboardHomePath, teamHomePath } from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { useSettingsData } from "./-settings.data";
import { prewarmTeam } from "./-team.data";
import { DashboardHeader } from "@/components/DashboardHeader";

type BillingPlan = "basic" | "pro";

const GIBIBYTE = 1024 ** 3;
const TEBIBYTE = 1024 ** 4;
const TEAM_TRIAL_DAYS = 7;

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

const PLAN_RANK = {
  basic: 0,
  pro: 1,
} as const satisfies Record<BillingPlan, number>;

function normalizeTeamPlan(plan: string): BillingPlan {
  return plan === "pro" || plan === "team" ? "pro" : "basic";
}

function formatBytes(bytes: number): string {
  if (bytes >= TEBIBYTE) return `${(bytes / TEBIBYTE).toFixed(1)} TB`;
  return `${(bytes / GIBIBYTE).toFixed(1)} GB`;
}

function formatUtcDateFromUnixSeconds(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export default function TeamSettingsPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate({});
  const pathname = useLocation().pathname;
  const convex = useConvex();
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";

  const { context, team, members, billing } = useSettingsData({ teamSlug });
  const updateTeam = useMutation(api.teams.update);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const createSubscriptionCheckout = useAction(api.billing.createSubscriptionCheckout);
  const createCustomerPortalSession = useAction(api.billing.createCustomerPortalSession);
  const updateTeamSubscriptionPlan = useAction(api.billing.updateTeamSubscriptionPlan);
  const reconcileTeamSubscription = useAction(api.billing.reconcileTeamSubscription);

  const reconciledTeamIdRef = useRef<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [isCheckingOutPlan, setIsCheckingOutPlan] = useState<BillingPlan | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState<BillingPlan | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
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

  useEffect(() => {
    if (!team || team.role !== "owner") return;
    if (reconciledTeamIdRef.current === team._id) return;

    reconciledTeamIdRef.current = team._id;
    void reconcileTeamSubscription({ teamId: team._id }).catch((error) => {
      console.warn("Stripe billing reconciliation failed", error);
    });
  }, [reconcileTeamSubscription, team]);

  if (context === undefined || team === undefined || shouldCanonicalize) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (context === null || !team) {
    return (
      <div className="flex h-full items-center justify-center">
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
  const isTrialing = subscriptionStatus === "trialing";
  const hasPortalAccess = isOwner && Boolean(billing?.stripeCustomerId);
  const currentPlanLabel = hasActiveSubscription ? planConfig.label : "Unpaid";
  const canDeleteTeam = isOwner && !hasActiveSubscription;

  const storageUsed = billing?.storageUsedBytes ?? 0;
  const storageLimit = planConfig.storageLimitBytes;
  const storagePct = storageLimit > 0 ? Math.min((storageUsed / storageLimit) * 100, 100) : 0;

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
    setBillingNotice(null);
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
      const message = error instanceof Error ? error.message : "Unable to start checkout.";
      setBillingError(message);
    } finally {
      setIsCheckingOutPlan(null);
    }
  };

  const handleChangePlan = async (targetPlan: BillingPlan) => {
    const targetConfig = BILLING_PLANS[targetPlan];
    const confirmed = confirm(
      `Upgrade ${team.name} to ${targetConfig.label} for $${targetConfig.monthlyPriceUsd}/month? Stripe will prorate the current billing period.`,
    );

    if (!confirmed) return;

    setBillingError(null);
    setBillingNotice(null);
    setIsChangingPlan(targetPlan);

    try {
      await updateTeamSubscriptionPlan({
        teamId: team._id,
        plan: targetPlan,
      });
      setBillingNotice(`Plan updated to ${targetConfig.label}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change plan.";
      setBillingError(message);
    } finally {
      setIsChangingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    if (typeof window === "undefined") return;
    setBillingError(null);
    setBillingNotice(null);
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
        error instanceof Error ? error.message : "Unable to open Stripe billing portal.";
      setBillingError(message);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
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
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
          {/* ── Hero: Team name + URL ── */}
          <div className="mb-8">
            {isEditingName ? (
              <div className="flex items-center gap-3">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-auto border-t-0 border-r-0 border-b-2 border-l-0 border-[#1a1a1a] bg-transparent px-2 py-1 text-4xl font-black tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <Button size="sm" onClick={() => void handleSaveName()}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="group flex items-baseline gap-3">
                <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a] lg:text-5xl">
                  {team.name}
                </h1>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditedName(team.name);
                      setIsEditingName(true);
                    }}
                    className="text-[#888] opacity-0 transition-colors group-hover:opacity-100 hover:text-[#1a1a1a]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <p className="mt-1 font-mono text-sm text-[#888]">
              {typeof window !== "undefined"
                ? `${window.location.origin}${teamHomePath(team.slug)}`
                : teamHomePath(team.slug)}
            </p>
          </div>

          {/* ── Stats strip ── */}
          <div className="mb-8 grid grid-cols-1 gap-4 border-t-2 border-b-2 border-[#1a1a1a] py-5 sm:grid-cols-3 sm:gap-6 lg:gap-12">
            <div>
              <p className="mb-1 text-[10px] tracking-[0.2em] text-[#888] uppercase">Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[#1a1a1a]">{currentPlanLabel}</span>
                {hasActiveSubscription ? (
                  <Badge variant={isTrialing ? "warning" : "success"}>
                    {isTrialing ? "Trialing" : "Active"}
                  </Badge>
                ) : (
                  <Badge variant="warning">{subscriptionStatus}</Badge>
                )}
              </div>
              {isTrialing && typeof billing?.currentPeriodEnd === "number" && (
                <p className="mt-2 text-xs text-[#888]">
                  Trial ends {formatUtcDateFromUnixSeconds(billing.currentPeriodEnd)} UTC
                </p>
              )}
            </div>
            <div>
              <p className="mb-1 text-[10px] tracking-[0.2em] text-[#888] uppercase">Storage</p>
              <p className="text-xl font-black text-[#1a1a1a]">
                {billing ? formatBytes(storageUsed) : "—"}
                <span className="text-sm font-bold text-[#888]">
                  {" "}
                  / {formatBytes(storageLimit)}
                </span>
              </p>
              <div className="mt-2 h-1.5 bg-[#ddd]">
                <div
                  className="h-full bg-[#2d5a2d] transition-all duration-500"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] tracking-[0.2em] text-[#888] uppercase">Seats</p>
              <p className="text-xl font-black text-[#1a1a1a]">{planConfig.seats}</p>
            </div>
          </div>

          {/* ── Two-column: Plans + Members ── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
            {/* Plans column */}
            <div className="lg:col-span-3">
              <h2 className="mb-4 text-[10px] font-bold tracking-[0.2em] text-[#888] uppercase">
                Plans
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(Object.keys(BILLING_PLANS) as BillingPlan[]).map((planId) => {
                  const config = BILLING_PLANS[planId];
                  const isCurrentPlan = planId === plan && hasActiveSubscription;
                  const isUpgradePlan =
                    isOwner && hasActiveSubscription && PLAN_RANK[planId] > PLAN_RANK[plan];
                  return (
                    <div
                      key={planId}
                      className={`border-2 p-5 transition-colors ${
                        isCurrentPlan
                          ? "border-[#2d5a2d] bg-[#2d5a2d] text-[#f0f0e8]"
                          : "border-[#1a1a1a] bg-[#f0f0e8]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p
                          className={`text-sm font-bold tracking-wider uppercase ${isCurrentPlan ? "text-[#f0f0e8]" : "text-[#888]"}`}
                        >
                          {config.label}
                        </p>
                        {isCurrentPlan && <Check className="h-4 w-4 text-[#7cb87c]" />}
                      </div>
                      <p
                        className={`text-3xl font-black ${isCurrentPlan ? "text-[#f0f0e8]" : "text-[#1a1a1a]"}`}
                      >
                        ${config.monthlyPriceUsd}
                        <span
                          className={`text-sm font-bold ${isCurrentPlan ? "text-[#7cb87c]" : "text-[#888]"}`}
                        >
                          /mo
                        </span>
                      </p>
                      <div
                        className={`mt-3 space-y-0.5 text-sm ${isCurrentPlan ? "text-[#c8e0c8]" : "text-[#888]"}`}
                      >
                        <p>{config.seats} seats</p>
                        <p>{formatBytes(config.storageLimitBytes)} storage</p>
                      </div>
                      {isOwner && !hasActiveSubscription && (
                        <Button
                          variant={planId === "pro" ? "primary" : "default"}
                          className="mt-4 w-full"
                          disabled={isCheckingOutPlan !== null || isChangingPlan !== null}
                          onClick={() => void handleStartCheckout(planId)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isCheckingOutPlan === planId
                            ? "Redirecting..."
                            : `Start ${config.label} Trial`}
                        </Button>
                      )}
                      {isUpgradePlan && (
                        <Button
                          variant="primary"
                          className="mt-4 w-full"
                          disabled={isCheckingOutPlan !== null || isChangingPlan !== null}
                          onClick={() => void handleChangePlan(planId)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isChangingPlan === planId
                            ? "Upgrading..."
                            : `Upgrade to ${config.label}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {hasPortalAccess && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={isOpeningPortal}
                  onClick={() => void handleOpenPortal()}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isOpeningPortal ? "Opening billing portal..." : "Manage subscription"}
                </Button>
              )}

              {billingError && (
                <p className="mt-3 text-sm font-bold text-[#dc2626]">{billingError}</p>
              )}
              {billingNotice && (
                <p className="mt-3 text-sm font-bold text-[#2d5a2d]">{billingNotice}</p>
              )}

              {!hasActiveSubscription && (
                <p className="mt-3 text-sm text-[#888]">
                  An active subscription is required to create projects and upload videos. Eligible
                  teams receive a {TEAM_TRIAL_DAYS}-day trial before billing starts.
                </p>
              )}
            </div>

            {/* Members column */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-[#888] uppercase">
                  Members
                  <span className="ml-2 text-[#1a1a1a]">{members?.length || 0}</span>
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => setMemberDialogOpen(true)}
                    className="text-xs font-bold tracking-wider text-[#2d5a2d] uppercase underline underline-offset-2 hover:text-[#3a6a3a]"
                  >
                    + Invite
                  </button>
                )}
              </div>

              <div className="border-t-2 border-[#1a1a1a]">
                {members?.slice(0, 8).map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between border-b border-[#ccc] py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1a1a1a]">{member.userName}</p>
                      <p className="truncate text-xs text-[#888]">{member.userEmail}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-[10px] font-bold tracking-[0.15em] text-[#888] uppercase">
                      {member.role}
                    </span>
                  </div>
                ))}
                {members && members.length > 8 && (
                  <button
                    onClick={() => setMemberDialogOpen(true)}
                    className="py-3 text-xs text-[#888] underline hover:text-[#1a1a1a]"
                  >
                    +{members.length - 8} more
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Danger zone ── */}
          {isOwner && (
            <div className="mt-16 flex items-center justify-between border-t-2 border-[#dc2626]/30 pt-6">
              <div>
                <p className="text-sm font-bold text-[#1a1a1a]">Delete team</p>
                <p className="mt-0.5 text-xs text-[#888]">
                  {canDeleteTeam
                    ? "Permanently remove this team, all projects, and videos."
                    : "Cancel the active subscription before deleting this team."}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTeam}
                disabled={!canDeleteTeam}
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
