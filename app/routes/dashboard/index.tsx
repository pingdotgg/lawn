import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { teamHomePath } from "@/lib/routes";
import { useDashboardIndexData } from "./-index.data";
import { DashboardHeader } from "@/components/DashboardHeader";
import { pickCurrentTeam, readLastTeamSlug } from "@/lib/currentTeam";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

export default function DashboardPage() {
  const { teams } = useDashboardIndexData();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (teams === undefined) {
    return (
      <div className="flex h-full flex-col">
        <DashboardHeader paths={[{ label: "dashboard" }]} />
      </div>
    );
  }

  const currentTeam = pickCurrentTeam(teams, undefined, readLastTeamSlug());
  if (currentTeam) {
    return <Navigate to={teamHomePath(currentTeam.slug)} replace />;
  }

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader paths={[{ label: "dashboard" }]} />

      <div className="animate-in fade-in flex flex-1 items-center justify-center p-8 duration-300">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center bg-[#e8e8e0]">
              <Users className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle className="text-lg">Create your first team</CardTitle>
            <CardDescription>
              Teams help you organize projects and collaborate on video reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create a team
            </Button>
          </CardContent>
        </Card>
      </div>

      <CreateTeamDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
