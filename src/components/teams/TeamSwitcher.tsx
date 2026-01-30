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
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { cn } from "@/lib/utils";

interface TeamSwitcherProps {
  compact?: boolean;
}

export function TeamSwitcher({ compact = false }: TeamSwitcherProps) {
  const teams = useQuery(api.teams.list);
  const router = useRouter();
  const params = useParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const currentTeam = teams?.find((t) => t?.slug === params.teamSlug);

  // Get initials for compact mode
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 transition-colors">
              {currentTeam ? getInitials(currentTeam.name) : "?"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={8}>
            <DropdownMenuLabel>Teams</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams?.map(
              (team) =>
                team && (
                  <DropdownMenuItem
                    key={team._id}
                    onClick={() => router.push(`/dashboard/${team.slug}`)}
                    className={cn(
                      "cursor-pointer",
                      team.slug === params.teamSlug && "bg-zinc-800"
                    )}
                  >
                    <span className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-[10px] font-medium mr-2">
                      {getInitials(team.name)}
                    </span>
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="truncate">
              {currentTeam?.name || "Select team"}
            </span>
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
