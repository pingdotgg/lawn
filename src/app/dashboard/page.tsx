"use client";

export const dynamic = "force-dynamic";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, ArrowRight } from "lucide-react";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const teams = useQuery(api.teams.list);
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Redirect to first team if user has teams
  useEffect(() => {
    if (teams && teams.length > 0 && teams[0]) {
      router.push(`/dashboard/${teams[0].slug}`);
    }
  }, [teams, router]);

  if (teams === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-neutral-600" />
            </div>
            <CardTitle>Create your first team</CardTitle>
            <CardDescription>
              Teams help you organize projects and collaborate with others on video reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your teams</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New team
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(
          (team) =>
            team && (
              <Card
                key={team._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/${team.slug}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <Badge variant="secondary">{team.plan}</Badge>
                  </div>
                  <CardDescription>
                    {team.role === "owner" ? "Owner" : team.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Open team
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
        )}
      </div>

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
