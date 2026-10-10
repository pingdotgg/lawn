import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { api } from "@convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { teamHomePath } from "@/lib/routes";
import { pickCurrentTeam, readLastTeamSlug, writeLastTeamSlug } from "@/lib/currentTeam";

export function TeamSwitcher() {
  const teams = useQuery(api.teams.list);
  const params = useParams({ strict: false });
  const routeSlug = typeof params.teamSlug === "string" ? params.teamSlug : undefined;
  const navigate = useNavigate({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [lastSlug] = useState(readLastTeamSlug);

  const currentTeam = teams ? pickCurrentTeam(teams, routeSlug, lastSlug) : undefined;
  const routeTeamSlug = currentTeam?.slug === routeSlug ? routeSlug : undefined;

  useEffect(() => {
    if (routeTeamSlug) writeLastTeamSlug(routeTeamSlug);
  }, [routeTeamSlug]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-10 w-32 items-center justify-between gap-2 border-2 border-[#1a1a1a] px-2 text-sm font-bold text-[#1a1a1a] transition-colors outline-none hover:bg-(--surface-alt) focus-visible:bg-(--surface-alt) data-[state=open]:bg-(--surface-alt) sm:w-48"
          aria-label={currentTeam ? `Current team: ${currentTeam.name}` : "Select team"}
        >
          <span className="truncate">
            {teams === undefined ? "" : (currentTeam?.name ?? "Select team")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#888]" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {teams?.map((team) => (
            <DropdownMenuItem
              key={team._id}
              className="gap-2"
              onSelect={() => {
                writeLastTeamSlug(team.slug);
                navigate({ to: teamHomePath(team.slug) });
              }}
            >
              <span className="min-w-0 flex-1 truncate">{team.name}</span>
              {team._id === currentTeam?._id && (
                <Check className="h-4 w-4 shrink-0 text-[#2d5a2d]" aria-hidden="true" />
              )}
            </DropdownMenuItem>
          ))}
          {teams && teams.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem className="gap-2" onSelect={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
