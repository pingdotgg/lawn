"use client";

export const dynamic = "force-dynamic";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, ArrowRight } from "lucide-react";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { teamHomePath } from "@/lib/routes";

export default function DashboardPage() {
  const teams = useQuery(api.teams.list);
  const router = useRouter();
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
                <Card
                  key={team._id}
                  className="group cursor-pointer hover:bg-[#e8e8e0] transition-colors"
                  onClick={() => router.push(teamHomePath(team.slug))}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <Badge variant="secondary">{team.plan}</Badge>
                    </div>
                    <CardDescription className="capitalize">
                      {team.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-[#888] group-hover:text-[#1a1a1a] transition-colors">
                      <span>Open team</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
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
