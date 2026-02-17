
import { useConvex } from "convex/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, ArrowRight } from "lucide-react";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { teamHomePath } from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { prewarmTeam } from "./-team.data";
import { useDashboardIndexData } from "./-index.data";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

type TeamCardProps = {
  plan: string;
  role: string;
  name: string;
  slug: string;
  onOpen: () => void;
};

function TeamCardItem({ name, role, plan, slug, onOpen }: TeamCardProps) {
  const convex = useConvex();
  const prewarmIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmTeam(convex, { teamSlug: slug }),
  );

  return (
    <Card
      className="group cursor-pointer hover:bg-[#e8e8e0] transition-colors"
      onClick={onOpen}
      {...prewarmIntentHandlers}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{name}</CardTitle>
          <Badge variant="secondary">{plan}</Badge>
        </div>
        <CardDescription className="capitalize">
          {role}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-[#888] group-hover:text-[#1a1a1a] transition-colors">
          <span>Open team</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { teams } = useDashboardIndexData();
  const navigate = useNavigate({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isLoading = teams === undefined;

  // Empty state - no teams
  if (teams && teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 animate-in fade-in duration-300">
        <Card className="max-w-sm w-full text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-[#e8e8e0] flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle className="text-lg">Create your first team</CardTitle>
            <CardDescription>
              Teams help you organize projects and collaborate on video reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create a team
            </Button>
          </CardContent>
        </Card>
        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 border-b-2 border-[#1a1a1a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[#1a1a1a]">Your teams</h1>
            <p className="text-[#888] text-sm mt-0.5">Select a team to continue</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New team
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div
          className={cn(
            "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
        >
          {teams?.map(
            (team) =>
              team && (
                <TeamCardItem
                  key={team._id}
                  name={team.name}
                  role={team.role}
                  plan={team.plan}
                  slug={team.slug}
                  onOpen={() => navigate({ to: teamHomePath(team.slug) })}
                />
              )
          )}
        </div>
      </div>

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
