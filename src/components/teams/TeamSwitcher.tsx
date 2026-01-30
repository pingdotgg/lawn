"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Users } from "lucide-react";
import { useState } from "react";
import { CreateTeamDialog } from "./CreateTeamDialog";

export function TeamSwitcher() {
  const teams = useQuery(api.teams.list);
  const router = useRouter();
  const params = useParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const currentTeam = teams?.find((t) => t?.slug === params.teamSlug);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="truncate">
                {currentTeam?.name || "Select team"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Teams</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {teams?.map(
            (team) =>
              team && (
                <DropdownMenuItem
                  key={team._id}
                  onClick={() => router.push(`/dashboard/${team.slug}`)}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {team.name}
                </DropdownMenuItem>
              )
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
